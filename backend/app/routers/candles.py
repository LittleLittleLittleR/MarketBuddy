from fastapi import APIRouter, Depends, Query
from loguru import logger

from app.dependencies.auth import get_current_user
from app.dependencies.redis_client import get_redis
from app.dependencies.supabase_client import get_supabase
from app.schemas.candles import CandleResponse, StockProfile
from app.services.candles_service import CandleService, RANGE_MAP
from app.utils.ticker_validator import validate_ticker

router = APIRouter(prefix="/api/tickers", tags=["candles"])


async def get_candle_service() -> CandleService:
    supabase = await get_supabase()
    return CandleService(redis_client=get_redis(), supabase=supabase)


@router.get("/{ticker}/candles", response_model=CandleResponse)
async def get_candles(
    ticker: str,
    range: str = Query(default="1D", description="Time range: 1D, 1W, 1M, 1Y"),
    service: CandleService = Depends(get_candle_service),
    current_user=Depends(get_current_user),
):
    validated = validate_ticker(ticker)

    if range not in RANGE_MAP:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid range '{range}'. Must be one of: {list(RANGE_MAP)}")

    logger.info(f"[CANDLES] {current_user.get('email')} requested {validated}:{range}")
    candles = await service.get_candles(validated, range)

    _, interval = RANGE_MAP[range]
    return CandleResponse(ticker=validated, range=range, interval=interval, candles=candles)


@router.get("/{ticker}/profile", response_model=StockProfile)
async def get_profile(
    ticker: str,
    service: CandleService = Depends(get_candle_service),
    current_user=Depends(get_current_user),
):
    validated = validate_ticker(ticker)
    logger.info(f"[PROFILE] {current_user.get('email')} requested profile for {validated}")
    return await service.get_profile(validated)
