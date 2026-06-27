from fastapi import APIRouter, Depends
from loguru import logger

from app.dependencies.auth import get_current_user
from app.dependencies.redis_client import get_redis
from app.services.earnings_service import EarningsService

router = APIRouter(prefix="/api/earnings", tags=["earnings"])


def get_earnings_service() -> EarningsService:
    return EarningsService(redis_client=get_redis())


@router.get("")
async def get_all_earnings(
    service: EarningsService = Depends(get_earnings_service),
    current_user=Depends(get_current_user),
):
    redis = service.redis_client

    cursor = 0
    all_tickers = []
    while True:
        cursor, batch = await redis.sscan("portfolio:tickers", cursor=cursor, count=1000)
        all_tickers.extend([t.decode("utf-8") if isinstance(t, bytes) else t for t in batch])
        if cursor == 0:
            break

    if not all_tickers:
        return []

    results = await service.get_all(all_tickers)
    return [
        {"ticker": ticker, "status": "ok" if data else "not_found", "data": data}
        for ticker, data in zip(all_tickers, results)
    ]


@router.get("/{ticker}")
async def get_earnings_by_ticker(
    ticker: str,
    service: EarningsService = Depends(get_earnings_service),
    current_user=Depends(get_current_user),
):
    data = await service.get_from_cache(ticker.upper())
    if data is None:
        logger.warning(f"[EARNINGS] No cached data for {ticker.upper()}")
        return {"ticker": ticker.upper(), "status": "not_found", "data": None}
    return {"ticker": ticker.upper(), "status": "ok", "data": data}


@router.post("/{ticker}/refresh")
async def refresh_earnings(
    ticker: str,
    service: EarningsService = Depends(get_earnings_service),
    current_user=Depends(get_current_user),
):
    logger.info(f"[EARNINGS] Manual refresh for {ticker.upper()} by {current_user.get('email')}")
    data = await service.fetch_and_store(ticker.upper())
    return {"ticker": ticker.upper(), "status": "ok", "data": data}
