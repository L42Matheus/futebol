import smtplib
from email.message import EmailMessage
from app.config import get_settings


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    settings = get_settings()
    subject = "Redefinicao de senha - QuemJoga"
    body = (
        "Recebemos um pedido para redefinir sua senha.\n\n"
        f"Acesse este link para criar uma nova senha:\n{reset_link}\n\n"
        f"Este link expira em {settings.reset_password_expire_minutes} minutos."
    )

    # Fallback para desenvolvimento sem SMTP configurado.
    if not settings.smtp_host or not settings.smtp_from_email:
        print(f"[password-reset] Para: {to_email} | Link: {reset_link}")
        return

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
