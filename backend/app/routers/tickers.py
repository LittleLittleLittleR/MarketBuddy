from fastapi import APIRouter, Depends, BackgroundTasks
from app.schemas.scraping import StocksRequest
from upstash_redis.asyncio import Redis
from app.dependencies.redis_client import get_redis
from app.services.ticker_worker import TickerScraperService
import json
from app.dependencies.auth import get_current_user
from loguru import logger

router = APIRouter(prefix="/api/tickers", tags=["tickers"])


@router.post("")
async def get_live_ticker_prices(
    tickers: StocksRequest,
    background_tasks: BackgroundTasks,
    redis_client: Redis = Depends(get_redis),
    current_user=Depends(get_current_user),
):

    # for this function i got two scenarios
    #   1. i batch request x num of stocks, all exists in cache -> return normally
    #   2. i request x num of stocks, there are y stocks that doesn't exist
    #       then, we use background worker to batch scrape them, return these stocks
    #       to frontend with status of PENDING, (frontend to update and repull data accordingly)

    req_tickers = [t.upper() for t in tickers.tickers]

    # check for cached prices

    cached_prices = await redis_client.hmget("stock:prices", *req_tickers)

    response_payload = {}
    tickers_to_scrape = []
    pending_hash_updates = {}

    for ticker, raw_val in zip(req_tickers, cached_prices):

        # data format:
        #   "ticker": {"price": float,
        #              "opening_price": float,
        #              "status": ["SUCCESS" | "FAILED" | "PENDING"],
        #              "timestamp": time_scraped}

        # case 1, ticker was cached in redis alrd, can js load the val
        if raw_val and json.loads(raw_val)["status"] == "SUCCESS":
            logger.success(
                f"[get_live_ticker_prices]: {ticker} cache found with raw val: ",
                raw_val,
            )
            response_payload[ticker] = json.loads(raw_val)
        # case 2, never see this ticker before,
        # 1. need to add to list to scrape for this
        # 2. add into portfolio:tickers in redis, so next time always scrape this
        # 3. return a PENDING field for frontend
        else:
            tickers_to_scrape.append(ticker)

            pending_state = {
                "price": None,
                "opening_price": None,
                "status": "PENDING",
                "updated_at": None,
            }
            pending_hash_updates[ticker] = json.dumps(pending_state)
            response_payload[ticker] = pending_state

    # now check if any tickers we need to scrape and spin up adhoc background worker to scrape
    if tickers_to_scrape:
        scraper = TickerScraperService(redis_client=redis_client)

        logger.info("[TICKERS] Received tickers to scrape: ", tickers_to_scrape)

        # batch update all the new tickers we see
        await redis_client.sadd("portfolio:tickers", *tickers_to_scrape)

        # batch update the pending tickers that are going to be rescraped
        await redis_client.hmset("stock:prices", pending_hash_updates)

        logger.info("Spinning up background_tasks")
        background_tasks.add_task(
            scraper.scrape_and_cache_batch,
            tickers_to_scrape,
            False,  # is_clock_sweep=False for lock guard (race condition)
        )

    return {"prices": response_payload}
