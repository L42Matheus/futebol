import httpx
from app.config import get_settings


async def get_supabase_user(access_token: str) -> dict:
    settings = get_settings()
    if not settings.supabase_url:
        raise RuntimeError("SUPABASE_URL não configurada no backend")

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()
