"""Cadastra na Efí a URL de webhook do Pix da assinatura.

Uso (na pasta backend, com o .env da Efí preenchido):

    python -m scripts.efi_webhook https://SUA-API

Monta a URL no formato que a Efí exige (token + "&ignorar=" no fim, porque
ela acrescenta "/pix" ao final da URL cadastrada) e registra para a chave
EFI_PIX_KEY.
"""
import asyncio
import sys
from urllib.parse import quote

from app.config import get_settings
from app.services import efi


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Uso: python -m scripts.efi_webhook https://SUA-API")
    settings = get_settings()
    if not efi.configurado():
        sys.exit("Preencha EFI_CLIENT_ID, EFI_CLIENT_SECRET, EFI_PIX_KEY e o certificado no .env")
    if not settings.efi_webhook_token:
        sys.exit("Defina EFI_WEBHOOK_TOKEN no .env antes de cadastrar o webhook")
    base = sys.argv[1].rstrip("/")
    url = f"{base}/api/v1/assinaturas/webhook/efi?token={quote(settings.efi_webhook_token)}&ignorar="
    print(asyncio.run(efi.configurar_webhook(url)))
    print(f"Webhook cadastrado: {url}")


if __name__ == "__main__":
    main()
