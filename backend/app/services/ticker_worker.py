import time
import asyncio
import yfinance as yf
import json
import pandas as pd
from datetime import datetime, timezone
from upstash_redis.asyncio import Redis

LOCK_TTL_SECONDS = 30


class TickerScraperService:
    def __init__(self, redis_client: Redis):
        self.redis_client = redis_client

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
                    tickers_to_scrape.append(ticker)
                # if lock is not acquired, another task is already scraping this ticker so js skip

            if not tickers_to_scrape:
                return  # Everything already being handled
            tickers = tickers_to_scrape

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

                    # 3. Validation Safety: Check if yfinance actually returned any rows
                    if close_series.empty or open_series.empty:
                        raise ValueError(f"No price history found for {ticker}")

                    # 4. Extract the exact numbers securely
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
                    print(
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
            print(f"[TICKER_SCRAPER_SERVICE] Error for batch {tickers}: {e}")
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
            flattened_args = []
            for ticker, data_json in payload.items():
                flattened_args.extend([ticker, data_json])
            await self.redis_client.hmset("stock:prices", payload)

        if not is_clock_sweep:
            # release locks for tickers we successfully processed
            for ticker in tickers:
                await self.redis_client.delete(f"lock:scraping:{ticker}")
