from fastapi import APIRouter, HTTPException, Depends
from httpx import get
from app.services.websocket_manager import ws_manager
from app.services.stock_analysis import StockAnalysisService
from app.dependencies import get_stock_service
from app.dependencies.supabase_client import get_supabase
from app.dependencies.redis_client import get_redis
from loguru import logger
from app.services.video_builder import batch_fetch_chart_data
import asyncio
from app.repositories.summary_repo import SummaryRepository
from app.utils.time_utils import get_time_to_6am

router = APIRouter(prefix="/api/test", tags=["dev-testing"])
redis_client = get_redis()


@router.post("/trigger-broadcast")
async def trigger_mock_broadcast(payload: dict):
    if not ws_manager.all_connections:
        return {"status": "skipped", "message": "No active WebSocket clients connected"}

    await ws_manager.broadcast_targeted_updates(payload)

    return {
        "status": "success",
        "tracked_rooms": list(ws_manager.ticker_subscriptions.keys()),
        "active_clients": len(ws_manager.all_connections),
    }


@router.post("/generate-video/{ticker}")
async def test_generate_video(
    ticker: str,
    service: StockAnalysisService = Depends(get_stock_service),
):
    links = await service.fetch_news_links(ticker=ticker)
    if not links:
        return {"status": "no news found", "ticker": ticker}

    context = "\n".join([f"[{a.title}: {a.snippet}]" for a in links])
    await service.generate_daily_video(ticker, context)
    return {"status": "done", "ticker": ticker}


@router.post("/tickers/batch_test")
async def test_batch_prices():
    supabase_client = await get_supabase()
    analysis_service = StockAnalysisService(
        redis_client=redis_client,
        summary_repository=SummaryRepository(supabase_client=supabase_client),
    )
    CHUNK_SIZE = 10

    try:  # scan Redis for the list of all tickers
        cursor = 0
        all_tracked_tickers = []
        while True:
            cursor, raw_batch = await redis_client.sscan(
                "portfolio:tickers", cursor=cursor, count=1000
            )
            tickers_list = [
                t.decode("utf-8") if isinstance(t, bytes) else t for t in raw_batch
            ]
            all_tracked_tickers.extend(tickers_list)
            if cursor == 0:
                break

        if not all_tracked_tickers:
            logger.warning(
                "[TEST_BATCH] No tickers tracked in 'portfolio:tickers'. Skipping."
            )

        # chunking the array
        chunks = [
            all_tracked_tickers[i : i + CHUNK_SIZE]
            for i in range(0, len(all_tracked_tickers), CHUNK_SIZE)
        ]

        logger.info(
            f"[TEST_BATCH] Processing {len(all_tracked_tickers)} tickers across {len(chunks)} chunks."
        )

        for index, chunk in enumerate(chunks):
            logger.info(
                f"[TEST_BATCH] Processing chunk {index + 1}/{len(chunks)}: {chunk}"
            )
            chart_data = await batch_fetch_chart_data(chunk)
            logger.debug(f"Chart data: {chart_data}")
            await asyncio.sleep(2)  # prevent spam for api calls

        logger.info("[TEST_BATCH] Daily sweep finished completely.")

    except Exception as e:
        logger.exception(f"[TEST_BATCH]: {e}")
        await asyncio.sleep(10)
    finally:
        logger.info("[TEST_BATCH]: Closing...")
