from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import asyncio
from contextlib import asynccontextmanager
import zoneinfo

from app.config import settings
from app.dependencies.supabase_client import get_supabase
from app.repositories.summary_repo import SummaryRepository
from app.routers import analysis, tickers
from app.services.stock_analysis import StockAnalysisService
from app.services.ticker_worker import TickerScraperService
from app.dependencies.redis_client import get_redis
from app.utils.time_utils import get_time_to_6am, is_market_open, sg_time_now

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
            print("[DAILY_SCHEDULER] Sleeping until next cycle...")
            print(f"[DAILY_SCHEDULER] Time to sleep: {time_to_sleep}")
            await asyncio.sleep(time_to_sleep)

            print(
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
                print(
                    "[DAILY_SCHEDULER] No tickers tracked in 'portfolio:tickers'. Skipping."
                )
                continue

            # chunking the array
            chunks = [
                all_tracked_tickers[i : i + CHUNK_SIZE]
                for i in range(0, len(all_tracked_tickers), CHUNK_SIZE)
            ]

            print(
                f"[DAILY_SCHEDULER] Processing {len(all_tracked_tickers)} tickers across {len(chunks)} chunks."
            )

            for index, chunk in enumerate(chunks):
                print(
                    f"[DAILY_SCHEDULER] Processing chunk {index + 1}/{len(chunks)}: {chunk}"
                )

                async def analyse_one(ticker: str):
                    try:
                        links = await analysis_service.fetch_news_links(ticker=ticker)
                        if not links:
                            return
                        context = "\n".join(
                            [f"[{a.title}: {a.snippet}]" for a in links]
                        )
                        return await analysis_service.scrape_and_summarise(
                            ticker, context
                        )
                    except Exception as err:
                        # TODO: Logging in the future + Retry
                        print(f"[DAILY_SCHEDULER ERROR] Failed on {ticker}: {err}")

                # fire the analysis concurrently
                await asyncio.gather(
                    *[analyse_one(t) for t in chunk], return_exceptions=True
                )
                await asyncio.sleep(2)  # prevent spam for api calls

            print("[DAILY_SCHEDULER] Daily sweep finished completely.")

        except Exception as e:
            print(f"[DAILY_SCHEDULER_ERROR]: {e}")
            await asyncio.sleep(10)
        finally:
            print("[DAILY_SCHEDULER]: Closing...")


async def on_the_dot_clock_scheduler():
    scraper = TickerScraperService(redis_client, max_sub_batch_size=40)

    print("[MINUTE_SCHEDULER]: Starting scheduler...")
    while True:
        try:
            now = sg_time_now()
            seconds_until_next_minute = 60 - now.second - (now.microsecond / 1000000.0)

            # sleep til next cycle
            await asyncio.sleep(seconds_until_next_minute)

            if not is_market_open():

                print(
                    f"[{sg_time_now().strftime('%H:%M:%S')}] Market not open. Skipping cycle."
                )
                continue

            # global clock lock to safeguard against overlapping loops
            clock_lock = await redis_client.set("lock:clock_sweep", "1", nx=True, ex=55)
            if not clock_lock:
                print(
                    f"[{sg_time_now().strftime('%H:%M:%S')}] Global sweep already running. Skipping cycle."
                )
                continue

            print(
                f"[{sg_time_now().strftime('%H:%M:%S')}] Starting global 1-minute sweep..."
            )

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
                await scraper.scrape_and_cache_batch(
                    all_tracked_tickers, is_clock_sweep=True
                )

            await redis_client.delete("lock:clock_sweep")
            print(
                f"[{sg_time_now().strftime('%H:%M:%S')}] Global 1-minute sweep complete."
            )

        except Exception as e:
            print(f"[CLOCK_SCHEDULER_ERROR]: {e}")
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    minute_scheduler_task = asyncio.create_task(on_the_dot_clock_scheduler())
    daily_schedular_task = asyncio.create_task(daily_analysis_scheduler())
    yield
    minute_scheduler_task.cancel()
    daily_schedular_task.cancel()
    try:
        await asyncio.gather(
            minute_scheduler_task, daily_schedular_task, return_exceptions=True
        )
    except asyncio.CancelledError:
        print("[LIFESPAN] CancelledError")

    print("[LIFESPAN] ALL Background scheduler successfully stopped.")


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, 
    allow_origins=settings.allowed_origins, 
    allow_methods=["*"], 
    allow_headers=["*"], 
    allow_credentials=True
)
app.include_router(analysis.router)
app.include_router(tickers.router)


@app.get("/")
def read_root():
    return {"root": "welcome to MarketBuddy"}