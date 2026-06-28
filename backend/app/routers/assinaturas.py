import logging
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import assinatura_ativa
from app.models import User, UserRole
from app.services import asaas
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


@router.get("/status")
def status_assinatura(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trial_end = _trial_ends_at(current_user)
    in_trial = assinatura_ativa(current_user) and current_user.subscription_status != "active"
    return {
        "subscription_status": current_user.subscription_status,
        "subscription_id": current_user.asaas_subscription_id,
        "in_trial": in_trial,
        "trial_ends_at": trial_end,
        "current_period_end": current_user.subscription_current_period_end,
        "access_granted": assinatura_ativa(current_user),
        "valor": get_settings().assinatura_valor,
    }


@router.post("/assinar", status_code=status.HTTP_201_CREATED)
async def assinar(payload: AssinarRequest, request: Request, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores assinam o plano")
    if current_user.subscription_status == "active":
        raise HTTPException(status_code=400, detail="Você já possui uma assinatura ativa")

    settings = get_settings()
    cpf_cnpj = "".join(ch for ch in payload.cpf_cnpj if ch.isdigit())

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
