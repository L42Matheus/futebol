import time
import httpx
import logging
from jose import jwt
from jose.exceptions import JWTError
from app.config import get_settings

logger = logging.getLogger(__name__)

_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL = 60 * 60  # 1h


async def _get_jwks() -> dict:
    settings = get_settings()
    if not settings.supabase_url:
        raise RuntimeError("SUPABASE_URL não configurada no backend")

    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL:
        return _jwks_cache["keys"]

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url)
        response.raise_for_status()
        jwks = response.json()

    _jwks_cache["keys"] = jwks
    _jwks_cache["fetched_at"] = now
    return jwks


async def get_supabase_user(access_token: str) -> dict:
    """Valida um JWT do Supabase via JWKS e retorna o payload."""
    jwks = await _get_jwks()

    try:
        header = jwt.get_unverified_header(access_token)
    except JWTError as e:
        raise ValueError(f"Token Supabase malformado: {e}") from e

    kid = header.get("kid")
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        raise ValueError("Chave de assinatura do Supabase não encontrada para esse token")

    try:
        payload = jwt.decode(
            access_token,
            key,
            algorithms=[header.get("alg", "ES256")],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except JWTError as e:
        logger.error("Falha ao validar JWT Supabase: %s", e)
        raise ValueError(f"Token Supabase inválido: {e}") from e

    return payload
