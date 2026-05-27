from fastapi import Depends
from upstash_redis.asyncio import Redis
from supabase import AsyncClient

# functionality of this file is so that we share all instances of classes, dont need keep reinitialising
from app.dependencies.redis_client import get_redis
from app.dependencies.supabase_client import get_supabase
from app.services.stock_analysis import StockAnalysisService


def get_stock_service(
    redis_client: Redis = Depends(get_redis),
    supabase_client: AsyncClient = Depends(get_supabase),
) -> StockAnalysisService:
    return StockAnalysisService(
        redis_client=redis_client, supabase_client=supabase_client
    )
