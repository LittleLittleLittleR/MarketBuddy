from fastapi import Depends
from upstash_redis.asyncio import Redis
from supabase import AsyncClient

# functionality of this file is so that we share all instances of classes, dont need keep reinitialising
from app.dependencies.redis_client import get_redis
from app.dependencies.supabase_client import get_supabase
from app.services.stock_analysis import StockAnalysisService
from app.repositories.summary_repo import SummaryRepository


def get_stock_service(
    redis_client: Redis = Depends(get_redis),
    supabase_client: AsyncClient = Depends(get_supabase),
) -> StockAnalysisService:

    summary_repository = SummaryRepository(supabase_client=supabase_client)

    return StockAnalysisService(
        redis_client=redis_client,
        summary_repository=summary_repository,
    )
