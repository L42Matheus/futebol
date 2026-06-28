"""Cliente da API Asaas para a assinatura SaaS dos admins.

Documentação: https://docs.asaas.com/reference
A autenticação usa o header ``access_token`` com a chave de API (sandbox ou produção,
conforme ``settings.asaas_base_url``).
"""
import logging
from datetime import date
from typing import Optional

import httpx
from fastapi import HTTPException

from app.config import get_settings

logger = logging.getLogger(__name__)

TIMEOUT = 20.0


def _headers() -> dict:
    settings = get_settings()
    if not settings.asaas_api_key:
        raise HTTPException(status_code=503, detail="Gateway de pagamento não configurado")
    return {
        "access_token": settings.asaas_api_key,
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    return get_settings().asaas_base_url.rstrip("/")


async def _request(method: str, path: str, **kwargs) -> dict:
    url = f"{_base_url()}{path}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.request(method, url, headers=_headers(), **kwargs)
    except httpx.HTTPError as exc:
        logger.exception("Falha de conexão com a Asaas")
        raise HTTPException(status_code=502, detail="Não foi possível contatar o gateway de pagamento") from exc

    if response.status_code >= 400:
        # A Asaas devolve {"errors": [{"description": "..."}]}
        detalhe = "Erro no gateway de pagamento"
        try:
            payload = response.json()
            erros = payload.get("errors") if isinstance(payload, dict) else None
            if erros:
                detalhe = "; ".join(e.get("description", "") for e in erros) or detalhe
        except ValueError:
            pass
        logger.error("Asaas %s %s -> %s: %s", method, path, response.status_code, response.text[:500])
        raise HTTPException(status_code=502, detail=f"Erro na Asaas: {detalhe}")

    return response.json()


async def criar_ou_obter_customer(nome: str, cpf_cnpj: str, email: Optional[str],
                                  telefone: Optional[str], existing_id: Optional[str]) -> str:
    """Cria um cliente na Asaas (ou retorna o já existente)."""
    if existing_id:
        return existing_id
    payload = {"name": nome, "cpfCnpj": cpf_cnpj}
    if email:
        payload["email"] = email
    if telefone:
        payload["mobilePhone"] = telefone
    data = await _request("POST", "/customers", json=payload)
    return data["id"]


async def criar_assinatura(customer_id: str, billing_type: str, valor_centavos: int,
                           descricao: str, card: Optional[dict] = None,
                           holder_info: Optional[dict] = None, remote_ip: Optional[str] = None) -> dict:
    """Cria uma assinatura mensal na Asaas.

    ``billing_type`` deve ser ``PIX`` ou ``CREDIT_CARD``. Para cartão, ``card`` e
    ``holder_info`` são obrigatórios pela Asaas.
    """
    payload = {
        "customer": customer_id,
        "billingType": billing_type,
        "cycle": "MONTHLY",
        "value": round(valor_centavos / 100, 2),
        "nextDueDate": date.today().isoformat(),
        "description": descricao,
    }
    if billing_type == "CREDIT_CARD":
        if not card or not holder_info:
            raise HTTPException(status_code=400, detail="Dados do cartão são obrigatórios")
        payload["creditCard"] = card
        payload["creditCardHolderInfo"] = holder_info
        if remote_ip:
            payload["remoteIp"] = remote_ip
    return await _request("POST", "/subscriptions", json=payload)


async def obter_assinatura(subscription_id: str) -> dict:
    return await _request("GET", f"/subscriptions/{subscription_id}")


async def listar_cobrancas_assinatura(subscription_id: str) -> dict:
    """Retorna as cobranças (payments) geradas por uma assinatura."""
    return await _request("GET", f"/subscriptions/{subscription_id}/payments")


async def obter_cobranca(payment_id: str) -> dict:
    return await _request("GET", f"/payments/{payment_id}")


async def obter_pix_qrcode(payment_id: str) -> dict:
    """Retorna o QR Code Pix (payload copia-e-cola + imagem base64) de uma cobrança."""
    return await _request("GET", f"/payments/{payment_id}/pixQrCode")
