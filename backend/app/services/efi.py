"""Cliente da API Pix da Efí (efipay.com.br) — cobrança Pix da assinatura do admin.

Mesma integração usada no projeto do cardápio (pix.js), portada para Python:

1. ``POST /oauth/token`` (Basic client_id:client_secret) para obter o access_token;
2. ``PUT /v2/cob/{txid}`` cria a cobrança imediata;
3. ``GET /v2/loc/{id}/qrcode`` devolve o QR Code (imagem) e o "copia e cola";
4. ``GET /v2/cob/{txid}`` consulta a cobrança (status ``CONCLUIDA`` = pago).

Toda chamada à Efí exige mTLS com o certificado ``.p12`` da aplicação, informado
de uma das duas formas (se as duas existirem, ``EFI_CERT_BASE64`` tem prioridade):

- ``EFI_CERT_PATH``: caminho local do arquivo ``.p12`` (ou ``.pem``) — uso local;
- ``EFI_CERT_BASE64``: conteúdo do ``.p12`` em base64 — uso no Railway, onde não
  dá pra montar um arquivo.

Documentação: https://dev.efipay.com.br/docs/api-pix/credenciais
"""
import base64
import logging
import os
import ssl
import tempfile
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import HTTPException

from app.config import get_settings

logger = logging.getLogger(__name__)

URL_PRODUCAO = "https://pix.api.efipay.com.br"
URL_HOMOLOGACAO = "https://pix-h.api.efipay.com.br"
TIMEOUT = 25.0  # evita deixar o admin esperando pra sempre se a Efí travar

_lock = threading.Lock()
_ssl_context: Optional[ssl.SSLContext] = None
_token: Optional[str] = None
_token_expira_em: float = 0.0


def configurado() -> bool:
    """True quando há credenciais da Efí; sem elas o Pix segue pela Asaas."""
    s = get_settings()
    return bool(s.efi_client_id and s.efi_client_secret and s.efi_pix_key
                and (s.efi_cert_base64 or s.efi_cert_path))


def _base_url() -> str:
    return URL_HOMOLOGACAO if get_settings().efi_sandbox else URL_PRODUCAO


def _pem_do_certificado() -> bytes:
    """Lê o certificado da Efí e devolve chave + certificado em PEM.

    A Efí entrega um ``.p12`` sem senha; o ``ssl`` do Python só carrega PEM,
    então convertemos aqui. Um arquivo que já esteja em PEM é usado como está.
    """
    s = get_settings()
    if s.efi_cert_base64:
        bruto = base64.b64decode("".join(s.efi_cert_base64.split()))
    else:
        with open(s.efi_cert_path, "rb") as arquivo:
            bruto = arquivo.read()

    if b"-----BEGIN" in bruto:
        return bruto

    from cryptography.hazmat.primitives.serialization import (
        Encoding, NoEncryption, PrivateFormat, pkcs12,
    )

    chave, certificado, cadeia = pkcs12.load_key_and_certificates(bruto, password=None)
    if chave is None or certificado is None:
        raise ValueError("Certificado .p12 da Efí sem chave privada ou certificado")
    pem = chave.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())
    pem += certificado.public_bytes(Encoding.PEM)
    for extra in cadeia or []:
        pem += extra.public_bytes(Encoding.PEM)
    return pem


def _contexto_ssl() -> ssl.SSLContext:
    global _ssl_context
    with _lock:
        if _ssl_context is None:
            try:
                pem = _pem_do_certificado()
            except Exception as exc:
                logger.exception("Falha ao carregar o certificado da Efí")
                raise HTTPException(status_code=503, detail="Certificado da Efí inválido ou ausente") from exc
            ctx = ssl.create_default_context()
            # load_cert_chain só aceita caminho de arquivo: grava num temporário e apaga.
            fd, caminho = tempfile.mkstemp(suffix=".pem")
            try:
                with os.fdopen(fd, "wb") as arquivo:
                    arquivo.write(pem)
                ctx.load_cert_chain(caminho)
            finally:
                os.remove(caminho)
            _ssl_context = ctx
        return _ssl_context


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=_base_url(), verify=_contexto_ssl(), timeout=TIMEOUT)


def _erro_efi(resposta: httpx.Response, acao: str) -> HTTPException:
    detalhe = "Erro no gateway Pix"
    try:
        corpo = resposta.json()
        if isinstance(corpo, dict):
            detalhe = corpo.get("mensagem") or corpo.get("error_description") or corpo.get("nome") or detalhe
    except ValueError:
        pass
    logger.error("Efí %s -> %s: %s", acao, resposta.status_code, resposta.text[:500])
    return HTTPException(status_code=502, detail=f"Erro na Efí: {detalhe}")


async def _access_token(client: httpx.AsyncClient) -> str:
    global _token, _token_expira_em
    if _token and time.monotonic() < _token_expira_em:
        return _token
    s = get_settings()
    resposta = await client.post(
        "/oauth/token",
        json={"grant_type": "client_credentials"},
        auth=(s.efi_client_id, s.efi_client_secret),
    )
    if resposta.status_code >= 400:
        raise _erro_efi(resposta, "oauth")
    dados = resposta.json()
    _token = dados["access_token"]
    # Renova um minuto antes de expirar (a Efí entrega tokens de 1h).
    _token_expira_em = time.monotonic() + max(int(dados.get("expires_in", 3600)) - 60, 0)
    return _token


async def _request(method: str, path: str, headers: Optional[dict] = None, **kwargs) -> dict:
    if not configurado():
        raise HTTPException(status_code=503, detail="Pix (Efí) não configurado")
    try:
        async with _client() as client:
            token = await _access_token(client)
            resposta = await client.request(
                method, path, headers={**(headers or {}), "Authorization": f"Bearer {token}"}, **kwargs
            )
    except httpx.TimeoutException as exc:
        logger.warning("Timeout falando com a Efí (%s %s)", method, path)
        raise HTTPException(status_code=504, detail="A Efí está demorando para responder. Tente novamente em instantes.") from exc
    except httpx.HTTPError as exc:
        logger.exception("Falha de conexão com a Efí")
        raise HTTPException(status_code=502, detail="Não foi possível contatar o gateway Pix") from exc
    if resposta.status_code >= 400:
        raise _erro_efi(resposta, f"{method} {path}")
    return resposta.json()


def novo_txid() -> str:
    # A Efí exige txid alfanumérico com 26 a 35 caracteres; uuid4 hex tem 32.
    return uuid.uuid4().hex


async def criar_cobranca_pix(txid: str, valor_centavos: int, cpf_cnpj: Optional[str],
                             nome: Optional[str], descricao: str) -> dict:
    """Cria a cobrança Pix e devolve o QR Code + "copia e cola" para o front."""
    s = get_settings()
    corpo = {
        "calendario": {"expiracao": s.efi_pix_expiracao},
        "valor": {"original": f"{valor_centavos / 100:.2f}"},
        "chave": s.efi_pix_key,
        "solicitacaoPagador": descricao[:140],
    }
    if cpf_cnpj and nome:
        campo = "cnpj" if len(cpf_cnpj) == 14 else "cpf"
        corpo["devedor"] = {campo: cpf_cnpj, "nome": nome[:200]}

    cobranca = await _request("PUT", f"/v2/cob/{txid}", json=corpo)
    qrcode = await _request("GET", f"/v2/loc/{cobranca['loc']['id']}/qrcode")

    # A Efí devolve a imagem já como data URI; o front monta o prefixo sozinho.
    imagem = qrcode.get("imagemQrcode") or ""
    if imagem.startswith("data:"):
        imagem = imagem.split(",", 1)[-1]

    expira_em = datetime.now(timezone.utc) + timedelta(seconds=s.efi_pix_expiracao)
    return {
        "txid": cobranca.get("txid", txid),
        "status": cobranca.get("status"),
        "copia_e_cola": cobranca.get("pixCopiaECola") or qrcode.get("qrcode"),
        "qrcode_base64": imagem or None,
        "expira_em": expira_em.isoformat(),
    }


async def consultar_cobranca(txid: str) -> dict:
    return await _request("GET", f"/v2/cob/{txid}")


async def configurar_webhook(webhook_url: str) -> dict:
    """Cadastra a URL de webhook para a chave Pix da conta.

    Usa ``x-skip-mtls-checking`` porque o Railway não termina mTLS: a proteção
    fica por conta do token na URL e da conferência da cobrança na própria Efí.
    """
    s = get_settings()
    return await _request(
        "PUT",
        f"/v2/webhook/{s.efi_pix_key}",
        json={"webhookUrl": webhook_url},
        headers={"x-skip-mtls-checking": "true"},
    )
