import logging
import smtplib
from email.message import EmailMessage
from email.utils import parseaddr

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _send_via_brevo(
    api_key: str, from_header: str, to_email: str, subject: str, body: str, reply_to: str | None = None
) -> None:
    # Railway bloqueia SMTP fora do plano Pro; a API HTTPS do Brevo funciona em qualquer plano.
    nome, email = parseaddr(from_header)
    sender = {"email": email}
    if nome:
        sender["name"] = nome
    payload = {
        "sender": sender,
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    if reply_to:
        payload["replyTo"] = {"email": reply_to}
    response = httpx.post(
        BREVO_URL,
        headers={"api-key": api_key, "accept": "application/json"},
        json=payload,
        timeout=15,
    )
    response.raise_for_status()


def _send_via_smtp(settings, to_email: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(msg)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    settings = get_settings()
    subject = "Redefinicao de senha - QuemJogaFC"
    body = (
        "Recebemos um pedido para redefinir sua senha.\n\n"
        f"Acesse este link para criar uma nova senha:\n{reset_link}\n\n"
        f"Este link expira em {settings.reset_password_expire_minutes} minutos."
    )

    if settings.brevo_api_key and settings.smtp_from_email:
        _send_via_brevo(settings.brevo_api_key, settings.smtp_from_email, to_email, subject, body)
        return

    # Fallback para desenvolvimento sem e-mail configurado.
    if not settings.smtp_host or not settings.smtp_from_email:
        logger.info("[password-reset] E-mail não configurado. Para: %s | Link: %s", to_email, reset_link)
        return

    _send_via_smtp(settings, to_email, subject, body)


def send_support_email(destino: str, assunto: str, corpo: str, responder_para: str) -> None:
    """Encaminha uma mensagem do formulário de suporte; responder ao e-mail vai direto para quem escreveu."""
    settings = get_settings()
    if settings.brevo_api_key and settings.smtp_from_email:
        _send_via_brevo(
            settings.brevo_api_key, settings.smtp_from_email, destino, assunto, corpo, reply_to=responder_para
        )
        return
    logger.info("[suporte] E-mail não configurado. Para: %s | %s\n%s", destino, assunto, corpo)
