from fastapi import APIRouter, Depends, BackgroundTasks
from upstash_redis.asyncio import Redis
from loguru import logger

from app.dependencies.auth import get_current_user
from app.dependencies.redis_client import get_redis
from app.dependencies.s3_client import get_presigned_url
from app.dependencies import get_stock_service
from app.services.stock_analysis import StockAnalysisService

router = APIRouter(prefix="/api/videos", tags=["videos"])


async def _generate_for_ticker(
    ticker: str,
    service: StockAnalysisService,
    redis: Redis,
):
    """
    1. add to portfolio:tickers
    2. fetch news + stock data
    3. store it  (scrape_and_summarise saves to Redis + Supabase)
    4. generate video
    """
    try:
        links = await service.fetch_news_links(ticker)
        if not links:
            logger.warning(f"[VIDEO_ON_DEMAND] No news found for {ticker}, aborting")
            return

        context = "\n".join([f"[{a.title}: {a.snippet}]" for a in links])

        await service.scrape_and_summarise(ticker, context)

        await service.generate_daily_video(ticker, context)

        logger.success(f"[VIDEO_ON_DEMAND] Finished {ticker}")

    except Exception as e:
        logger.exception(f"[VIDEO_ON_DEMAND] Failed for {ticker}: {e}")

    finally:
        await redis.delete(f"stock:{ticker}:video:pending")


@router.get("/{ticker}/latest")
async def get_latest_video(
    ticker: str,
    background_tasks: BackgroundTasks,
    redis: Redis = Depends(get_redis),
    service: StockAnalysisService = Depends(get_stock_service),
    current_user=Depends(get_current_user),
):
    ticker_upper = ticker.upper()

    # if video already exists
    s3_key = await redis.get(f"stock:{ticker_upper}:video:daily")
    if s3_key:
        key = s3_key if isinstance(s3_key, str) else s3_key.decode()
        signed_url = await get_presigned_url(key)
        return {"url": signed_url, "status": "READY"}

    # if vid doesnt exist

    # add to portfolio:tickers
    await redis.sadd("portfolio:tickers", ticker_upper)

    # safeguard lock to prevent 2 people from requesting
    # generation of new ticker at the same time
    already_pending = await redis.get(f"stock:{ticker_upper}:video:pending")
    if already_pending:
        logger.debug(f"[VIDEO_ON_DEMAND] {ticker_upper} already generating, skipping")
        return {"url": None, "status": "PENDING"}

    # mark as pending with 5 min expiry so it auto-resets if the background task crashes
    await redis.set(f"stock:{ticker_upper}:video:pending", "1", ex=300)

    # create background task for this
    background_tasks.add_task(_generate_for_ticker, ticker_upper, service, redis)
    logger.info(f"[VIDEO_ON_DEMAND] Queued generation for {ticker_upper}")

    return {"url": None, "status": "PENDING"}
