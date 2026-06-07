import time
import asyncio
import yfinance as yf
import json
import pandas as pd
from upstash_redis.asyncio import Redis
from loguru import logger

LOCK_TTL_SECONDS = 30


class TickerScraperService:
    def __init__(self, redis_client: Redis, max_sub_batch_size: int = 40):
        self.redis_client = redis_client
        self.max_sub_batch_size = max_sub_batch_size

    async def scrape_and_cache_batch(
        self, tickers: list[str], is_clock_sweep: bool = False
    ):
        """
        Core scraper. Called by both the ad-hoc trigger and the minute clock.
        is_clock_sweep=True  → main minute clock
        is_clock_sweep=False → adhoc scrape
        """
        if not tickers:
            return

        logger.debug(f"Received tickers: {tickers}")
        # adhoc
        if not is_clock_sweep:
            tickers_to_scrape = []
            for ticker in tickers:
                lock_key = f"lock:scraping:{ticker}"
                # SET NX EX: only set if key doesn't exist, with TTL
                acquired = await self.redis_client.set(
                    lock_key, "1", nx=True, ex=LOCK_TTL_SECONDS
                )
                if acquired:
                    logger.debug(f"Lock acquired for {ticker}")
                    tickers_to_scrape.append(ticker)
                # if lock is not acquired, another task is already scraping this ticker so js skip

            if not tickers_to_scrape:
                return  # Everything already being handled
            tickers = tickers_to_scrape

        # seperate into batch calls
        sub_batches = [
            tickers[i : i + self.max_sub_batch_size]
            for i in range(0, len(tickers), self.max_sub_batch_size)
        ]

        #  logger.debug(f"sub_batches: {sub_batches}")
        # concurrently call scraper for each chunk
        chunk_results = await asyncio.gather(
            *[self._scrape_chunk(chunk) for chunk in sub_batches]
        )
        combined_payload = {}
        for result in chunk_results:
            if result and isinstance(result, dict):
                combined_payload.update(result)

        # This unified master dictionary gets passed directly to your WebSocket rooms!
        # if combined_payload:
        # logger.debug(f"Combined Payload: {combined_payload}")

        # release locks after all chunks finish processing
        if not is_clock_sweep:
            lock_keys = [f"lock:scraping:{t}" for t in tickers]
            if lock_keys:
                logger.info("Deleting lock keys...")
                await asyncio.gather(*[self.redis_client.delete(k) for k in lock_keys])

        if not is_clock_sweep:
            # release locks for tickers we successfully processed
            logger.info("[IS_CLOCK_SWEEP] Deleting lock keys...")
            for ticker in tickers:
                await self.redis_client.delete(f"lock:scraping:{ticker}")

        logger.debug(f"Combined Payload: {combined_payload}")
        return combined_payload

    async def _scrape_chunk(self, tickers: list[str]):
        ticker_string = " ".join(tickers)
        payload = {}

        try:
            data = await asyncio.to_thread(
                yf.download,
                tickers=ticker_string,
                period="1d",
                group_by="ticker",
                progress=False,
                auto_adjust=True,
            )

            for ticker in tickers:
                try:
                    # 1. Handle Multi-Index DataFrames (Multiple Tickers Fetched)
                    if isinstance(data.columns, pd.MultiIndex):
                        if ticker not in data.columns.levels[0]:
                            raise ValueError(
                                f"Ticker {ticker} not found in yfinance response columns"
                            )

                        close_series = data[ticker]["Close"].dropna()
                        open_series = data[ticker]["Open"].dropna()

                    # 2. Handle Single-Index DataFrames (Single Ticker Fetched)
                    else:
                        close_series = data["Close"].dropna()
                        open_series = data["Open"].dropna()

                    if close_series.empty or open_series.empty:
                        raise ValueError(f"No price history found for {ticker}")

                    current_price = close_series.iloc[-1]
                    opening_price = open_series.iloc[0]

                    payload[ticker] = json.dumps(
                        {
                            "price": round(float(current_price), 2),
                            "opening_price": round(float(opening_price), 2),
                            "status": "SUCCESS",
                            "updated_at": time.time(),
                        }
                    )
                except Exception as e:
                    logger.exception(
                        f"[TICKER_SCRAPER_SERVICE:scrape_and_cache_batch] Data parsing error for {ticker}: {e}"
                    )
                    payload[ticker] = json.dumps(
                        {
                            "price": None,
                            "opening_price": None,
                            "status": "FAILED",
                            "updated_at": time.time(),
                        }
                    )
        except Exception as e:
            logger.exception(f"[TICKER_SCRAPER_SERVICE] Error for batch {tickers}: {e}")
            for ticker in tickers:
                payload[ticker] = json.dumps(
                    {
                        "price": None,
                        "opening_price": None,
                        "status": "FAILED",
                        "updated_at": time.time(),
                    }
                )

        # write payload to redis
        if payload:
            print(
                "[TICKER_SCRAPER_SERVICE:scrape_and_cache_batch]: Payload received: ",
                payload,
            )
            await self.redis_client.hmset("stock:prices", payload)
        return payload
