import time
import httpx
import logging
from jose import jwt
from jose.exceptions import JWTError
from app.config import get_settings

logger = logging.getLogger(__name__)

_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL = 60 * 60  # 1h


def _get_supabase_base_url() -> str:
    settings = get_settings()
    supabase_url = (settings.supabase_url or "").strip().rstrip("/")
    if not supabase_url:
        raise RuntimeError("SUPABASE_URL não configurada no backend")

    # No painel do Supabase é comum copiar a REST URL (.../rest/v1).
    # A autenticação, porém, precisa da raiz do projeto.
    if supabase_url.endswith("/rest/v1"):
        supabase_url = supabase_url[: -len("/rest/v1")]

    return supabase_url


async def _get_jwks() -> dict:
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL:
        return _jwks_cache["keys"]

    url = f"{_get_supabase_base_url()}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url)
        response.raise_for_status()
        jwks = response.json()

    _jwks_cache["keys"] = jwks
    _jwks_cache["fetched_at"] = now
    return jwks


async def _get_user_via_supabase_api(access_token: str) -> dict:
    settings = get_settings()
    if not settings.supabase_anon_key:
        raise RuntimeError("SUPABASE_ANON_KEY não configurada no backend")

    url = f"{_get_supabase_base_url()}/auth/v1/user"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            url,
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {access_token}",
            },
        )
        response.raise_for_status()
        return response.json()


async def get_supabase_user(access_token: str) -> dict:
    """Valida um JWT do Supabase via JWKS e retorna o payload."""
    try:
        jwks = await _get_jwks()
        header = jwt.get_unverified_header(access_token)
    except Exception as e:
        logger.warning("JWKS indisponível, tentando validar token pela API Supabase: %s", e)
        return await _get_user_via_supabase_api(access_token)

    kid = header.get("kid")
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        logger.warning("Chave JWKS não encontrada para kid=%s, tentando API Supabase", kid)
        return await _get_user_via_supabase_api(access_token)

    try:
        payload = jwt.decode(
            access_token,
            key,
            algorithms=[header.get("alg", "ES256")],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except JWTError as e:
        logger.warning("Falha ao validar JWT Supabase via JWKS, tentando API Supabase: %s", e)
        return await _get_user_via_supabase_api(access_token)

    return payload
