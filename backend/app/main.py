import sys

from loguru import logger
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import settings
from app.dependencies.supabase_client import get_supabase
from app.repositories.summary_repo import SummaryRepository
from app.routers import analysis, test, tickers, websocket_router, videos, earnings, email_admin, candles
from app.services.stock_analysis import StockAnalysisService
from app.services.ticker_worker import TickerScraperService
from app.dependencies.redis_client import get_redis
from app.utils.time_utils import (
    get_time_to_6am,
    get_time_to_8am,
    get_time_to_1st_of_month_9am,
    is_market_open,
    sg_time_now,
    seconds_until_market_open,
)
from app.services.websocket_manager import ws_manager
from app.services.earnings_service import EarningsService
from app.services.video_builder import batch_fetch_chart_data
from app.services.portfolio_digest_service import PortfolioDigestService
from app.services.email_service import send_monthly_digest
from app.repositories.email_job_repo import EmailJobRepository
from datetime import datetime, timezone

logger.remove()

# format for SGT
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS ZZ}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    enqueue=True,
)


redis_client = get_redis()


async def daily_analysis_scheduler():

    supabase_client = await get_supabase()
    analysis_service = StockAnalysisService(
        redis_client=redis_client,
        summary_repository=SummaryRepository(supabase_client=supabase_client),
    )
    CHUNK_SIZE = 10

    while True:
        try:
            time_to_sleep = get_time_to_6am()
            logger.info("[DAILY_SCHEDULER] Sleeping until next cycle...")
            logger.info(f"[DAILY_SCHEDULER] Time to sleep: {time_to_sleep}")
            await asyncio.sleep(time_to_sleep)

            logger.info(
                "[DAILY_SCHEDULER] Wake up triggered! Fetching tickers from 'portfolio:tickers'..."
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
                    "[DAILY_SCHEDULER] No tickers tracked in 'portfolio:tickers'. Skipping."
                )
                continue

            # chunking the array
            chunks = [
                all_tracked_tickers[i : i + CHUNK_SIZE]
                for i in range(0, len(all_tracked_tickers), CHUNK_SIZE)
            ]

            logger.info(
                f"[DAILY_SCHEDULER] Processing {len(all_tracked_tickers)} tickers across {len(chunks)} chunks."
            )

            for index, chunk in enumerate(chunks):
                logger.info(
                    f"[DAILY_SCHEDULER] Processing chunk {index + 1}/{len(chunks)}: {chunk}"
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
                        context = "\n".join(
                            [f"[{a.title}: {a.snippet}]" for a in links]
                        )
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
                            f"[DAILY_SCHEDULER ERROR] Failed on {ticker}: {err}"
                        )
                        return ticker, None, None

                # fire the analysis ONLY concurrently -> then feed results into video builder synchrononously
                await asyncio.gather(
                    *[analyse_one(t) for t in chunk], return_exceptions=True
                )
                await asyncio.sleep(2)  # prevent spam for api calls

                """
                Video section: Commenting for now so not going to run daily 

                # build videos one by one to prevent RAM spike
                for result in results:
                    if isinstance(result, BaseException) or not isinstance(
                        result, tuple
                    ):
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
                        logger.exception(
                            f"Issue while generating video for {ticker}: {e}"
                        )

                    await asyncio.sleep(1)
                    """

            logger.info("[DAILY_SCHEDULER] Daily sweep finished completely.")

        except Exception as e:
            logger.exception(f"[DAILY_SCHEDULER_ERROR]: {e}")
            await asyncio.sleep(10)
        finally:
            logger.info("[DAILY_SCHEDULER]: Closing...")


async def earnings_scheduler():
    supabase_client = await get_supabase()
    earnings_service = EarningsService(redis_client=redis_client, supabase=supabase_client)
    CHUNK_SIZE = 10

    while True:
        try:
            time_to_sleep = get_time_to_8am()
            logger.info(f"[EARNINGS_SCHEDULER] Sleeping for {time_to_sleep}s until next cycle...")
            await asyncio.sleep(time_to_sleep)

            cursor = 0
            all_tracked_tickers = []
            while True:
                cursor, raw_batch = await redis_client.sscan(
                    "portfolio:tickers", cursor=cursor, count=1000
                )
                all_tracked_tickers.extend([
                    t.decode("utf-8") if isinstance(t, bytes) else t for t in raw_batch
                ])
                if cursor == 0:
                    break

            if not all_tracked_tickers:
                logger.warning("[EARNINGS_SCHEDULER] No tickers in 'portfolio:tickers'. Skipping.")
                continue

            chunks = [
                all_tracked_tickers[i: i + CHUNK_SIZE]
                for i in range(0, len(all_tracked_tickers), CHUNK_SIZE)
            ]

            logger.info(f"[EARNINGS_SCHEDULER] Processing {len(all_tracked_tickers)} tickers across {len(chunks)} chunks.")

            for index, chunk in enumerate(chunks):
                logger.info(f"[EARNINGS_SCHEDULER] Chunk {index + 1}/{len(chunks)}: {chunk}")

                await asyncio.gather(
                    *[earnings_service.process_ticker(t) for t in chunk],
                    return_exceptions=True,
                )
                await asyncio.sleep(2)

            logger.success("[EARNINGS_SCHEDULER] Daily sweep complete.")

        except Exception as e:
            logger.exception(f"[EARNINGS_SCHEDULER_ERROR]: {e}")
            await asyncio.sleep(10)
        finally:
            logger.info("[EARNINGS_SCHEDULER]: Closing...")


async def on_the_dot_clock_scheduler():
    scraper = TickerScraperService(redis_client, max_sub_batch_size=10)

    logger.info("[MINUTE_SCHEDULER]: Starting scheduler...")
    while True:
        try:
            now = sg_time_now()

            if not is_market_open():
                sleep_seconds = seconds_until_market_open()
                logger.info(
                    f"market closed. sleeping for {sleep_seconds:.0f}s until market open."
                )
                await asyncio.sleep(sleep_seconds)
                continue

            seconds_until_next_minute = 60 - now.second - (now.microsecond / 1000000.0)

            # sleep til next cycle
            await asyncio.sleep(seconds_until_next_minute)

            if not is_market_open():
                logger.debug("Market not open. Skipping cycle.")
                continue

            # global clock lock to safeguard against overlapping loops
            clock_lock = await redis_client.set("lock:clock_sweep", "1", nx=True, ex=55)
            if not clock_lock:
                logger.debug("Global sweep already running. Skipping cycle.")
                continue

            logger.info("Starting global 1-minute sweep...")

            # scan redis for portfolio:tickers to scrape
            cursor = 0
            all_tracked_tickers = []

            while True:
                cursor, raw_batch = await redis_client.sscan(
                    "portfolio:tickers", cursor=cursor, count=1000
                )
                # handle b'' data from redis
                tickers_list = [
                    t.decode("utf-8") if isinstance(t, bytes) else t for t in raw_batch
                ]
                all_tracked_tickers.extend(tickers_list)

                if cursor == 0:
                    break

            if all_tracked_tickers:
                fresh_data = await scraper.scrape_and_cache_batch(
                    all_tracked_tickers, is_clock_sweep=True
                )
                if fresh_data:
                    logger.info(
                        f"[BROADCAST] Pushing updates for tickers: {list(fresh_data.keys())}"
                    )
                    await ws_manager.broadcast_targeted_updates(fresh_prices=fresh_data)

            await redis_client.delete("lock:clock_sweep")
            logger.info("Global 1-minute sweep complete.")

        except Exception as e:
            logger.exception(f"[CLOCK_SCHEDULER_ERROR]: {e}")
            await asyncio.sleep(1)


async def monthly_digest_scheduler():
    supabase = await get_supabase()
    repo = EmailJobRepository(supabase)

    while True:
        try:
            sleep_secs = get_time_to_1st_of_month_9am()
            logger.info(f"[DIGEST_SCHEDULER] Sleeping {sleep_secs}s until 1st of month 9am SGT")
            await asyncio.sleep(sleep_secs)

            now = sg_time_now()
            month, year = now.month, now.year

            # List all users; those with no email_preferences row are opted-in by default
            all_users = await supabase.auth.admin.list_users()
            all_user_ids = [u.id for u in (all_users if isinstance(all_users, list) else [])]

            # Remove users who explicitly opted out
            prefs_resp = (
                await supabase.table("email_preferences")
                .select("user_id")
                .eq("monthly_digest_enabled", False)
                .execute()
            )
            opted_out = {row["user_id"] for row in (prefs_resp.data or [])}
            opted_in_ids = [uid for uid in all_user_ids if uid not in opted_out]

            jobs_created = await repo.create_jobs_for_month(opted_in_ids, month, year)
            logger.info(f"[DIGEST_SCHEDULER] Created {jobs_created} jobs for {month}/{year}")

        except Exception as e:
            logger.exception(f"[DIGEST_SCHEDULER_ERROR]: {e}")
            await asyncio.sleep(60)
        finally:
            logger.info("[DIGEST_SCHEDULER]: Closing...")


async def _process_email_job(job: dict, supabase, repo: EmailJobRepository, digest_service: PortfolioDigestService) -> None:
    job_id: int = job["id"]
    user_id: str = job["user_id"]
    month: int = job["month"]
    year: int = job["year"]
    retry_count: int = job["retry_count"]
    month_label = datetime(year, month, 1).strftime("%B %Y")

    try:
        user_resp = await supabase.auth.admin.get_user_by_id(user_id)
        user_email: str | None = user_resp.user.email
        if not user_email:
            logger.warning(f"[EMAIL] Skipping job_id={job_id}: user_id={user_id} has no email address")
            await repo.mark_failed(job_id, "user has no email address", retry_count)
            return

        digest = await digest_service.build_digest(user_id, month, year)
        await send_monthly_digest(user_email, digest, month_label, user_id)

        await repo.mark_sent(job_id, datetime.now(timezone.utc))
        logger.info(f"[EMAIL] Sent to user_id={user_id}")

    except Exception as e:
        logger.error(f"[EMAIL] Failed job_id={job_id}: {e}")
        await repo.mark_failed(job_id, str(e), retry_count)


async def email_job_queue_worker():
    supabase = await get_supabase()
    repo = EmailJobRepository(supabase)
    digest_service = PortfolioDigestService(supabase)

    logger.info("[EMAIL_WORKER] Starting...")
    while True:
        try:
            await asyncio.sleep(30)
            jobs = await repo.fetch_pending_batch(limit=20)
            if not jobs:
                continue

            logger.info(f"[EMAIL_WORKER] Processing {len(jobs)} pending jobs")
            await asyncio.gather(
                *[_process_email_job(j, supabase, repo, digest_service) for j in jobs],
                return_exceptions=True,
            )

        except Exception as e:
            logger.exception(f"[EMAIL_WORKER_ERROR]: {e}")
            await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    minute_scheduler_task = asyncio.create_task(on_the_dot_clock_scheduler())
    daily_schedular_task = asyncio.create_task(daily_analysis_scheduler())
    earnings_scheduler_task = asyncio.create_task(earnings_scheduler())
    digest_scheduler_task = asyncio.create_task(monthly_digest_scheduler())
    email_worker_task = asyncio.create_task(email_job_queue_worker())
    logger.success("[LIFESPAN] Background schedulers are active")
    yield
    minute_scheduler_task.cancel()
    daily_schedular_task.cancel()
    earnings_scheduler_task.cancel()
    digest_scheduler_task.cancel()
    email_worker_task.cancel()
    try:
        await asyncio.gather(
            minute_scheduler_task,
            daily_schedular_task,
            earnings_scheduler_task,
            digest_scheduler_task,
            email_worker_task,
            return_exceptions=True,
        )
    except asyncio.CancelledError:
        logger.warning("[LIFESPAN] CancelledError")
    logger.success("[LIFESPAN] ALL Background scheduler successfully stopped.")


app = FastAPI(lifespan=lifespan)

print(settings.ALLOWED_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(analysis.router)
app.include_router(earnings.router)
app.include_router(tickers.router)
app.include_router(candles.router)
app.include_router(websocket_router.router)
app.include_router(videos.router)
app.include_router(test.router)
app.include_router(email_admin.router)


@app.get("/")
def read_root():
    return {"root": "welcome to MarketBuddy"}
