from fastapi import APIRouter, Depends
from app.services.websocket_manager import ws_manager
from app.services.stock_analysis import StockAnalysisService
from app.dependencies import get_stock_service
from app.dependencies.redis_client import get_redis
from loguru import logger
from app.services.video_builder import batch_fetch_chart_data
import asyncio
from app.dependencies.supabase_client import get_supabase
from app.repositories.summary_repo import SummaryRepository
from app.dependencies.s3_client import get_presigned_url

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


@router.post("/simulate_daily")
async def simulate_daily():
    supabase_client = await get_supabase()
    analysis_service = StockAnalysisService(
        redis_client=redis_client,
        summary_repository=SummaryRepository(supabase_client=supabase_client),
    )
    CHUNK_SIZE = 10

    try:
        logger.info(
            "[TEST_DAILY_SCHEDULER] Wake up triggered! Fetching tickers from 'portfolio:tickers'..."
        )

        # scan Redis for the list of all tickers
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
                "[TEST_DAILY_SCHEDULER] No tickers tracked in 'portfolio:tickers'. Skipping."
            )
            return

        # chunking the array
        chunks = [
            all_tracked_tickers[i : i + CHUNK_SIZE]
            for i in range(0, len(all_tracked_tickers), CHUNK_SIZE)
        ]

        logger.info(
            f"[TEST_DAILY_SCHEDULER] Processing {len(all_tracked_tickers)} tickers across {len(chunks)} chunks."
        )

        for index, chunk in enumerate(chunks):
            logger.info(
                f"[TEST_DAILY_SCHEDULER] Processing chunk {index + 1}/{len(chunks)}: {chunk}"
            )
            chart_data = await batch_fetch_chart_data(chunk)

            async def analyse_one(ticker: str):
                """
                # returns ticker, context, chart_data for ticker -> feed to video builder
                """
                try:
                    links = await analysis_service.fetch_news_links(ticker=ticker)
                    if not links:
                        return ticker, None, None
                    context = "\n".join([f"[{a.title}: {a.snippet}]" for a in links])
                    await analysis_service.scrape_and_summarise(ticker, context)
                    """
                    await analysis_service.generate_daily_video(
                        ticker,
                        context,
                        prefetched=chart_data.get(ticker.upper()),
                    )
                    """
                    return ticker, context, chart_data.get(ticker.upper())
                except Exception as err:
                    logger.exception(
                        f"[TEST_DAILY_SCHEDULER ERROR] Failed on {ticker}: {err}"
                    )
                    return ticker, None, None

            # fire the analysis ONLY concurrently -> then feed results into video builder synchrononously
            results = await asyncio.gather(
                *[analyse_one(t) for t in chunk], return_exceptions=True
            )
            await asyncio.sleep(2)  # prevent spam for api calls

            # build videos one by one to prevent RAM spike
            for result in results:
                if isinstance(result, BaseException) or not isinstance(result, tuple):
                    continue
                ticker, context, prefetched = result
                if context is None:
                    logger.warning(f"Issue when generating video for {result[0]}")
                    continue
                try:
                    logger.info(f"Generating video for {ticker}...")
                    await analysis_service.generate_daily_video(
                        ticker, context, prefetched=prefetched
                    )
                    logger.success(f"Completed generating video for {ticker}!")
                except Exception as e:
                    logger.exception(f"Issue while generating video for {ticker}: {e}")
                await asyncio.sleep(1)

        logger.info("[TEST_DAILY_SCHEDULER] Daily sweep finished completely.")

    except Exception as e:
        logger.exception(f"[TEST_DAILY_SCHEDULER_ERROR]: {e}")
        await asyncio.sleep(10)
    finally:
        logger.info("[TEST_DAILY_SCHEDULER]: Closing...")


@router.post("/get_all_videos")
async def get_all_videos():
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
            "[TEST_DAILY_SCHEDULER] No tickers tracked in 'portfolio:tickers'. Skipping."
        )
        return
    payload = {}
    for ticker in all_tracked_tickers:
        s3_key = await redis_client.get(f"stock:{ticker.upper()}:video:daily")
        if s3_key:
            key = s3_key if isinstance(s3_key, str) else s3_key.decode()
            signed_url = await get_presigned_url(key)
            payload[ticker.upper()] = signed_url

    return payload
