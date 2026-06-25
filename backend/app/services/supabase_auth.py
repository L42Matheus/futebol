import httpx
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)


async def get_supabase_user(access_token: str) -> dict:
    settings = get_settings()
    if not settings.supabase_url:
        raise RuntimeError("SUPABASE_URL não configurada no backend")
    if not settings.supabase_anon_key:
        raise RuntimeError("SUPABASE_ANON_KEY não configurada no backend")

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": settings.supabase_anon_key,
            },
        )
        if response.status_code >= 400:
            logger.error("Supabase /user falhou: %s %s", response.status_code, response.text)
            response.raise_for_status()
        return response.json()
