import asyncio
import json
from datetime import datetime, date
from typing import Optional
import zoneinfo

import yfinance as yf
from upstash_redis.asyncio import Redis
from supabase import AsyncClient
from loguru import logger
from app.repositories.earnings_repo import EarningsRepository

ET = zoneinfo.ZoneInfo("America/New_York")
SGT = zoneinfo.ZoneInfo("Asia/Singapore")


def _redis_key(ticker: str) -> str:
    return f"stock:{ticker}:earnings"


def _today_et() -> date:
    return datetime.now(ET).date()


def _fetch_earnings_data(ticker: str) -> dict:
    t = yf.Ticker(ticker)

    calendar = t.calendar or {}
    earnings_date = None
    eps_estimate = None

    raw_dates = calendar.get("Earnings Date", [])
    if raw_dates:
        earnings_date = (
            raw_dates[0].date()
            if hasattr(raw_dates[0], "date")
            else date.fromisoformat(str(raw_dates[0])[:10])
        )
    eps_estimate = calendar.get("Earnings Average")
    if hasattr(eps_estimate, "item"):
        eps_estimate = eps_estimate.item()

    eps_actual = None
    eps_surprise_pct = None

    ed = t.earnings_dates
    if ed is not None and not ed.empty:
        reported = ed[ed["Reported EPS"].notna()]
        if not reported.empty:
            latest = reported.iloc[0]
            eps_actual = (
                latest["Reported EPS"].item()
                if hasattr(latest["Reported EPS"], "item")
                else float(latest["Reported EPS"])
            )
            surprise = latest.get("Surprise(%)")
            if surprise is not None and not (
                hasattr(surprise, "__float__")
                and __import__("math").isnan(float(surprise))
            ):
                eps_surprise_pct = (
                    surprise.item() if hasattr(surprise, "item") else float(surprise)
                )

    revenue_actual = None
    operating_income = None
    gross_margin = None
    operating_margin = None

    qs = t.quarterly_income_stmt
    if qs is not None and not qs.empty:
        col = qs.columns[0]

        def _get(label):
            return float(qs.loc[label, col]) if label in qs.index else None

        revenue = _get("Total Revenue")
        gross = _get("Gross Profit")
        op_inc = _get("Operating Income")

        revenue_actual = revenue
        operating_income = op_inc
        if revenue:
            gross_margin = round(gross / revenue, 4) if gross is not None else None
            operating_margin = (
                round(op_inc / revenue, 4) if op_inc is not None else None
            )

    return {
        "ticker": ticker.upper(),
        "earnings_date": earnings_date.isoformat() if earnings_date else None,
        "eps_estimate": eps_estimate,
        "eps_actual": eps_actual,
        "eps_surprise_pct": eps_surprise_pct,
        "revenue_actual": revenue_actual,
        "operating_income": operating_income,
        "gross_margin": gross_margin,
        "operating_margin": operating_margin,
        "last_updated": datetime.now(SGT).isoformat(),
    }


class EarningsService:
    def __init__(self, redis_client: Redis, supabase: Optional[AsyncClient] = None):
        self.redis_client = redis_client
        self._repo = EarningsRepository(supabase) if supabase else None

    async def fetch_and_store(self, ticker: str) -> dict:
        data = await asyncio.to_thread(_fetch_earnings_data, ticker)
        await self.redis_client.set(_redis_key(ticker), json.dumps(data))
        logger.info(f"[earnings] stored {ticker} in Redis")

        if self._repo:
            await self._repo.upsert_earnings(data)

        return data

    async def get_from_cache(self, ticker: str) -> dict | None:
        raw = await self.redis_client.get(_redis_key(ticker))
        if raw:
            return json.loads(raw)

        if self._repo:
            logger.info(f"[earnings] Redis miss for {ticker}, checking Supabase")
            return await self._repo.get_earnings(ticker)

        return None

    async def process_ticker(self, ticker: str) -> None:
        try:
            cached = await self.get_from_cache(ticker)
            if cached is None:
                logger.info(f"[earnings] no cache for {ticker} — initial fetch")
                await self.fetch_and_store(ticker)
            elif (
                cached.get("earnings_date")
                and date.fromisoformat(cached["earnings_date"]) == _today_et()
            ):
                logger.info(f"[earnings] earnings day for {ticker} — fetching actuals")
                await self.fetch_and_store(ticker)
            else:
                logger.debug(f"[earnings] {ticker} up to date, skipping")
        except Exception as e:
            logger.exception(f"[earnings] process_ticker failed for {ticker}: {e}")

    async def get_all(self, tickers: list[str]) -> list[dict | None]:
        keys = [_redis_key(t) for t in tickers]
        values = await self.redis_client.mget(*keys)
        return [json.loads(v) if v else None for v in values]
