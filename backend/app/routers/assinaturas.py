import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from dateutil.relativedelta import relativedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import assinatura_ativa, pix_efi_vencido
from app.models import User, UserRole
from app.services import asaas, efi
from app.services.auth import get_current_user

router = APIRouter(prefix="/assinaturas", tags=["Assinaturas"])
logger = logging.getLogger(__name__)


class CartaoCredito(BaseModel):
    holderName: str
    number: str
    expiryMonth: str
    expiryYear: str
    ccv: str


class TitularCartao(BaseModel):
    name: str
    email: str
    cpfCnpj: str
    postalCode: str
    addressNumber: str
    phone: Optional[str] = None


class AssinarRequest(BaseModel):
    cpf_cnpj: str = Field(..., min_length=11, max_length=18)
    billing_type: str = Field(..., pattern="^(PIX|CREDIT_CARD)$")
    card: Optional[CartaoCredito] = None
    holder_info: Optional[TitularCartao] = None


def _trial_ends_at(user: User):
    if user.created_at is None:
        return None
    return user.created_at + timedelta(days=get_settings().assinatura_trial_dias)


def _status_exibido(user: User) -> Optional[str]:
    # Pix da Efí vencido aparece como "em atraso" para o admin pagar o próximo mês.
    if user.subscription_status == "active" and pix_efi_vencido(user):
        return "overdue"
    return user.subscription_status


def _confirmar_pix_efi(db: Session, user: User, cobranca: dict) -> bool:
    """Ativa a assinatura se a cobrança consultada NA Efí está paga.

    Nunca confia só no corpo do webhook: o status e o valor vêm da consulta
    à própria Efí, e a cobrança tem de ser a última gerada para o usuário.
    """
    txid = cobranca.get("txid")
    if not txid or txid != user.efi_pix_txid or user.subscription_status != "pending":
        return False
    if cobranca.get("status") != "CONCLUIDA":
        return False
    esperado = get_settings().assinatura_valor
    recebido = sum(round(float(p.get("valor", 0)) * 100) for p in cobranca.get("pix") or [])
    if recebido < esperado:
        logger.warning("Pix Efí %s pago com valor menor (%s < %s centavos)", txid, recebido, esperado)
        return False
    user.subscription_status = "active"
    user.subscription_gateway = "efi"
    user.subscription_current_period_end = datetime.now(timezone.utc) + relativedelta(months=1)
    db.commit()
    logger.info("Assinatura do usuário %s ativada via Pix Efí (txid=%s)", user.id, txid)
    return True


@router.get("/status")
async def status_assinatura(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = get_settings()
    if not settings.payments_enabled:
        return {
            "payments_enabled": False,
            "subscription_status": "free",
            "subscription_id": None,
            "in_trial": False,
            "trial_ends_at": None,
            "current_period_end": None,
            "access_granted": True,
            "valor": settings.assinatura_valor,
        }

    # A tela consulta o status enquanto o QR Code está aberto: se o webhook
    # ainda não chegou (ou não foi cadastrado), confere direto na Efí.
    if (current_user.subscription_gateway == "efi" and current_user.subscription_status == "pending"
            and current_user.efi_pix_txid and efi.configurado()):
        try:
            _confirmar_pix_efi(db, current_user, await efi.consultar_cobranca(current_user.efi_pix_txid))
        except HTTPException:
            logger.warning("Não foi possível consultar o Pix %s na Efí", current_user.efi_pix_txid)

    trial_end = _trial_ends_at(current_user)
    status_exibido = _status_exibido(current_user)
    in_trial = assinatura_ativa(current_user) and status_exibido != "active"
    return {
        "payments_enabled": True,
        "subscription_status": status_exibido,
        "subscription_id": current_user.asaas_subscription_id or current_user.efi_pix_txid,
        "in_trial": in_trial,
        "trial_ends_at": trial_end,
        "current_period_end": current_user.subscription_current_period_end,
        "access_granted": assinatura_ativa(current_user),
        "valor": settings.assinatura_valor,
    }


async def _assinar_pix_efi(cpf_cnpj: str, db: Session, user: User) -> dict:
    settings = get_settings()
    txid = efi.novo_txid()
    cobranca = await efi.criar_cobranca_pix(
        txid=txid,
        valor_centavos=settings.assinatura_valor,
        cpf_cnpj=cpf_cnpj,
        nome=user.nome,
        descricao="Assinatura QuemJogaFC - gestão de racha",
    )
    user.cpf_cnpj = cpf_cnpj
    user.subscription_gateway = "efi"
    user.efi_pix_txid = cobranca["txid"]
    user.subscription_status = "pending"
    db.commit()

    # Mesmo formato da resposta da Asaas: a tela não muda nada.
    return {
        "subscription_id": cobranca["txid"],
        "billing_type": "PIX",
        "payment_status": cobranca["status"],
        "invoice_url": None,
        "pix": {
            "payload": cobranca["copia_e_cola"],
            "encoded_image": cobranca["qrcode_base64"],
            "expiration_date": cobranca["expira_em"],
        },
    }


@router.post("/assinar", status_code=status.HTTP_201_CREATED)
async def assinar(payload: AssinarRequest, request: Request, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    settings = get_settings()
    if not settings.payments_enabled:
        raise HTTPException(status_code=403, detail="Pagamentos desativados — teste gratuito")
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores assinam o plano")
    if current_user.subscription_status == "active" and not pix_efi_vencido(current_user):
        raise HTTPException(status_code=400, detail="Você já possui uma assinatura ativa")

    cpf_cnpj = "".join(ch for ch in payload.cpf_cnpj if ch.isdigit())

    if payload.billing_type == "PIX" and efi.configurado():
        return await _assinar_pix_efi(cpf_cnpj, db, current_user)

    customer_id = await asaas.criar_ou_obter_customer(
        nome=current_user.nome or current_user.email or "Admin",
        cpf_cnpj=cpf_cnpj,
        email=current_user.email,
        telefone=current_user.telefone,
        existing_id=current_user.asaas_customer_id,
    )

    sub = await asaas.criar_assinatura(
        customer_id=customer_id,
        billing_type=payload.billing_type,
        valor_centavos=settings.assinatura_valor,
        descricao="Assinatura QuemJogaFC - gestão de racha",
        card=payload.card.model_dump() if payload.card else None,
        holder_info=payload.holder_info.model_dump(exclude_none=True) if payload.holder_info else None,
        remote_ip=request.client.host if request.client else None,
    )

    current_user.cpf_cnpj = cpf_cnpj
    current_user.asaas_customer_id = customer_id
    current_user.asaas_subscription_id = sub["id"]
    current_user.subscription_gateway = "asaas"
    current_user.subscription_status = "pending"
    db.commit()

    # Busca a primeira cobrança da assinatura para devolver link/QR Pix ao front
    invoice_url = None
    pix = None
    payment_status = None
    try:
        cobrancas = await asaas.listar_cobrancas_assinatura(sub["id"])
        primeira = (cobrancas.get("data") or [None])[0]
        if primeira:
            invoice_url = primeira.get("invoiceUrl")
            payment_status = primeira.get("status")
            if payload.billing_type == "PIX":
                pix = await asaas.obter_pix_qrcode(primeira["id"])
    except HTTPException:
        logger.warning("Assinatura %s criada, mas falhou ao obter a cobrança", sub["id"])

    return {
        "subscription_id": sub["id"],
        "billing_type": payload.billing_type,
        "payment_status": payment_status,
        "invoice_url": invoice_url,
        "pix": {
            "payload": pix.get("payload"),
            "encoded_image": pix.get("encodedImage"),
            "expiration_date": pix.get("expirationDate"),
        } if pix else None,
    }


@router.post("/webhook/asaas")
async def webhook_asaas(request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    token = request.headers.get("asaas-access-token")
    if not settings.asaas_webhook_token or token != settings.asaas_webhook_token:
        raise HTTPException(status_code=401, detail="Token de webhook inválido")

    body = await request.json()
    event = body.get("event")
    pagamento = body.get("payment") or {}
    assinatura = body.get("subscription") or {}

    subscription_id = pagamento.get("subscription") or assinatura.get("id")
    customer_id = pagamento.get("customer") or assinatura.get("customer")

    user = None
    if subscription_id:
        user = db.query(User).filter(User.asaas_subscription_id == subscription_id).first()
    if user is None and customer_id:
        user = db.query(User).filter(User.asaas_customer_id == customer_id).first()

    if user is None:
        # Evento de uma assinatura que não conhecemos — ignorar de forma idempotente.
        logger.info("Webhook Asaas '%s' sem usuário correspondente (sub=%s)", event, subscription_id)
        return {"received": True}

    if event in ("PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"):
        user.subscription_status = "active"
        vencimento = pagamento.get("dueDate") or pagamento.get("nextDueDate")
        if vencimento:
            user.subscription_current_period_end = vencimento
    elif event == "PAYMENT_OVERDUE":
        user.subscription_status = "overdue"
    elif event in ("SUBSCRIPTION_DELETED", "PAYMENT_DELETED", "PAYMENT_REFUNDED"):
        user.subscription_status = "canceled"

    db.commit()
    return {"received": True}


@router.post("/webhook/efi")
@router.post("/webhook/efi/pix")
async def webhook_efi(request: Request, db: Session = Depends(get_db)):
    """Notificação da Efí quando um Pix cai.

    Cadastre na Efí a URL com o token e um parâmetro descartável no fim, porque
    a Efí acrescenta "/pix" ao final da URL cadastrada:
    https://SUA-API/api/v1/assinaturas/webhook/efi?token=EFI_WEBHOOK_TOKEN&ignorar=
    """
    settings = get_settings()
    if settings.efi_webhook_token and request.query_params.get("token") != settings.efi_webhook_token:
        raise HTTPException(status_code=403, detail="Token de webhook inválido")

    # Ao cadastrar o webhook, a Efí faz uma chamada sem "pix" só para ver se
    # a URL responde 2xx: corpo vazio é no-op, não erro.
    try:
        body = await request.json()
    except ValueError:
        body = {}
    eventos = body.get("pix") if isinstance(body, dict) else None

    resultados = []
    for evento in eventos if isinstance(eventos, list) else []:
        txid = evento.get("txid") if isinstance(evento, dict) else None
        user = db.query(User).filter(User.efi_pix_txid == txid).first() if txid else None
        if user is None:
            resultados.append({"txid": txid, "ok": False, "motivo": "cobrança não encontrada"})
            continue
        try:
            ativou = _confirmar_pix_efi(db, user, await efi.consultar_cobranca(txid))
            resultados.append({"txid": txid, "ok": True, "ativou": ativou})
        except HTTPException as exc:
            # A Efí reenvia o webhook se não receber 200; o polling da tela
            # também confere a cobrança, então só registramos a falha.
            logger.warning("Webhook Efí: falha ao conferir txid %s: %s", txid, exc.detail)
            resultados.append({"txid": txid, "ok": False, "motivo": "falha ao consultar a Efí"})

    return {"recebido": True, "resultados": resultados}
