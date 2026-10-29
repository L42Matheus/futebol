"""Formulário de suporte: aberto sem login, aproveita a conta quando a pessoa está logada."""

import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import ChamadoSuporte, User
from app.schemas.suporte import ASSUNTOS, ChamadoCreate, ChamadoResponse
from app.services.auth import get_optional_user
from app.services.email_service import send_support_email

router = APIRouter(prefix="/suporte", tags=["Suporte"])
logger = logging.getLogger(__name__)

# Limite simples por IP, em memória: suficiente para segurar spam num app pequeno.
LIMITE_POR_HORA = 5
_envios: dict[str, deque] = defaultdict(deque)


def _ip(request: Request) -> str:
    # Na Railway o IP real vem no X-Forwarded-For.
    encaminhado = request.headers.get("x-forwarded-for", "")
    return encaminhado.split(",")[0].strip() or (request.client.host if request.client else "desconhecido")


def _dentro_do_limite(ip: str) -> bool:
    agora = time.monotonic()
    fila = _envios[ip]
    while fila and agora - fila[0] > 3600:
        fila.popleft()
    if len(fila) >= LIMITE_POR_HORA:
        return False
    fila.append(agora)
    return True


def _protocolo(chamado_id: int) -> str:
    return f"QJ-{chamado_id:05d}"


def _encaminhar(destino: str, chamado: ChamadoSuporte, usuario_id: int | None) -> None:
    try:
        corpo = (
            f"Protocolo: {_protocolo(chamado.id)}\n"
            f"Assunto: {ASSUNTOS.get(chamado.assunto, chamado.assunto)}\n"
            f"Nome: {chamado.nome}\n"
            f"E-mail: {chamado.email}\n"
            f"Conta no app: {'#' + str(usuario_id) if usuario_id else 'não estava logado'}\n"
            f"Tela: {chamado.pagina or '-'}\n"
            f"Aparelho: {chamado.navegador or '-'}\n\n"
            f"{chamado.mensagem}\n\n"
            "Responda este e-mail para falar direto com quem escreveu."
        )
        assunto = f"[Suporte {_protocolo(chamado.id)}] {ASSUNTOS.get(chamado.assunto, chamado.assunto)} - {chamado.nome}"
        send_support_email(destino, assunto, corpo, responder_para=chamado.email)
    except Exception:
        # A mensagem já está salva; falha no e-mail não pode sumir com o pedido.
        logger.exception("Falha ao encaminhar o chamado %s por e-mail", chamado.id)


@router.post("/", response_model=ChamadoResponse, status_code=status.HTTP_201_CREATED)
def abrir_chamado(
    payload: ChamadoCreate,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario: User | None = Depends(get_optional_user),
):
    if payload.site:
        # Robô preencheu o campo escondido: finge que deu certo e não guarda nada.
        return ChamadoResponse(id=0, protocolo=_protocolo(0))
    if not _dentro_do_limite(_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Você enviou muitas mensagens seguidas. Tente de novo daqui a pouco.",
        )

    chamado = ChamadoSuporte(
        user_id=usuario.id if usuario else None,
        nome=payload.nome.strip(),
        email=str(payload.email),
        assunto=payload.assunto,
        mensagem=payload.mensagem.strip(),
        pagina=payload.pagina,
        navegador=(request.headers.get("user-agent") or "")[:300] or None,
    )
    db.add(chamado)
    db.commit()
    db.refresh(chamado)

    destino = get_settings().suporte_email
    if destino:
        background.add_task(_encaminhar, destino, chamado, usuario.id if usuario else None)
    else:
        logger.info("Chamado %s salvo; SUPORTE_EMAIL não configurado", chamado.id)

    return ChamadoResponse(id=chamado.id, protocolo=_protocolo(chamado.id))
