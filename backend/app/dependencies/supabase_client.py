from supabase import AsyncClient, acreate_client
from app.config import settings


async def get_supabase() -> AsyncClient:
    return await acreate_client(settings.supabase_url, settings.supabase_key)
