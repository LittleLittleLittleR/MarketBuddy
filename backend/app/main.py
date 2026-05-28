from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import asyncio
from contextlib import asynccontextmanager

from app.config import settings
from app.routers import analysis, tickers
from app.services.ticker_worker import TickerScraperService
from app.dependencies.redis_client import get_redis


async def on_the_dot_clock_scheduler():
    redis_client = get_redis()
    scraper = TickerScraperService(redis_client, max_sub_batch_size=40)

    while True:
        try:
            now = datetime.now(timezone.utc)
            seconds_until_next_minute = 60 - now.second - (now.microsecond / 1000000.0)

            # sleep til next cycle
            await asyncio.sleep(seconds_until_next_minute)

            # global clock lock to safeguard against overlapping loops
            clock_lock = await redis_client.set("lock:clock_sweep", "1", nx=True, ex=55)
            if not clock_lock:
                print(
                    f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Global sweep already running. Skipping cycle."
                )
                continue

            print(
                f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Starting global 1-minute sweep..."
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
                f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Global 1-minute sweep complete."
            )

        except Exception as e:
            print(f"[CLOCK_SCHEDULER_ERROR]: {e}")
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_task = asyncio.create_task(on_the_dot_clock_scheduler())
    yield
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        print("[LIFESPAN] Background ticker scheduler successfully stopped.")


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins)
app.include_router(analysis.router)
app.include_router(tickers.router)


@app.get("/")
def read_root():
    return {"root": "welcome to MarketBuddy"}
