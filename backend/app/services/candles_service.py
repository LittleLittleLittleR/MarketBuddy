import asyncio
import json
from datetime import date

import yfinance as yf
from loguru import logger
from supabase import AsyncClient
from upstash_redis.asyncio import Redis

RANGE_MAP: dict[str, tuple[str, str]] = {
    "1D": ("1d", "1m"),
    "1W": ("5d", "15m"),
    "1M": ("1mo", "1h"),
    "1Y": ("1y", "1d"),
}

# how long each intraday range lives in Redis (seconds)
INTRADAY_TTL: dict[str, int] = {
    "1D": 60,
    "1W": 300,
    "1M": 900,
}

DAILY_RANGES = {"1Y"}


def _redis_candle_key(ticker: str, range_str: str) -> str:
    return f"stock:{ticker}:candles:{range_str}"


def _redis_profile_key(ticker: str) -> str:
    return f"stock:{ticker}:profile"


def _fetch_candles_sync(ticker: str, period: str, interval: str) -> list[dict]:
    """Calls yfinance in a thread (used with asyncio.to_thread)."""
    df = yf.download(
        ticker,
        period=period,
        interval=interval,
        auto_adjust=True,
        progress=False,
    )

    if df is None or df.empty:
        return []

    # yfinance can return MultiIndex columns when downloading a single ticker
    if isinstance(df.columns, type(df.columns)) and hasattr(df.columns, "levels"):
        df.columns = df.columns.get_level_values(0)

    df = df.dropna(subset=["Open", "High", "Low", "Close"])

    candles = []
    is_daily = interval == "1d"

    for ts, row in df.iterrows():
        if is_daily:
            # lightweight-charts daily series wants "YYYY-MM-DD" strings
            time_val: int | str = (
                ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
            )
        else:
            # intraday series wants UNIX seconds (UTC)
            time_val = int(ts.timestamp())

        candles.append(
            {
                "time": time_val,
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row.get("Volume", 0) or 0),
            }
        )

    return candles


def _fetch_profile_sync(ticker: str) -> dict:
    info = yf.Ticker(ticker).info or {}

    def _safe(key: str):
        val = info.get(key)
        return val if val != "N/A" else None

    return {
        "ticker": ticker,
        "company_name": _safe("longName") or _safe("shortName"),
        "currency": _safe("currency"),
        "exchange": _safe("exchange"),
        "market_cap": _safe("marketCap"),
        "pe_ratio": _safe("trailingPE"),
        "eps": _safe("trailingEps"),
        "fifty_two_week_high": _safe("fiftyTwoWeekHigh"),
        "fifty_two_week_low": _safe("fiftyTwoWeekLow"),
        "last_price": _safe("regularMarketPrice") or _safe("currentPrice"),
        "day_open": _safe("regularMarketOpen") or _safe("open"),
        "prev_close": _safe("regularMarketPreviousClose") or _safe("previousClose"),
        "day_high": _safe("dayHigh"),
        "day_low": _safe("dayLow"),
        "volume": _safe("volume"),
        "avg_volume": _safe("averageVolume"),
        "dividend_yield": _safe("dividendYield"),
        "sector": _safe("sector"),
    }


class CandleService:
    def __init__(self, redis_client: Redis, supabase: AsyncClient):
        self.redis = redis_client
        self.supabase = supabase

    async def get_candles(self, ticker: str, range_str: str) -> list[dict]:
        if range_str not in RANGE_MAP:
            raise ValueError(
                f"Unsupported range: {range_str}. Must be one of {list(RANGE_MAP)}"
            )

        period, interval = RANGE_MAP[range_str]

        if range_str in DAILY_RANGES:
            return await self._get_daily_candles(ticker)
        else:
            return await self._get_intraday_candles(ticker, range_str, period, interval)

    async def _get_intraday_candles(
        self, ticker: str, range_str: str, period: str, interval: str
    ) -> list[dict]:
        key = _redis_candle_key(ticker, range_str)
        cached = await self.redis.get(key)

        if cached:
            logger.debug(f"[CANDLES] Redis hit for {ticker}:{range_str}")
            return json.loads(cached)

        logger.info(
            f"[CANDLES] Redis miss for {ticker}:{range_str} — fetching from yfinance"
        )
        candles = await asyncio.to_thread(_fetch_candles_sync, ticker, period, interval)

        if candles:
            ttl = INTRADAY_TTL[range_str]
            await self.redis.set(key, json.dumps(candles), ex=ttl)

        return candles

    async def _get_daily_candles(self, ticker: str) -> list[dict]:
        today = date.today().isoformat()

        try:
            resp = (
                await self.supabase.table("daily_candles")
                .select("date,open,high,low,close,volume")
                .eq("ticker", ticker)
                .order("date", desc=False)
                .execute()
            )
            rows = resp.data or []

            if rows and rows[-1]["date"] >= today:
                logger.debug(f"[CANDLES] Supabase hit for {ticker}:1Y")
                return [
                    {
                        "time": r["date"],
                        "open": float(r["open"]),
                        "high": float(r["high"]),
                        "low": float(r["low"]),
                        "close": float(r["close"]),
                        "volume": float(r["volume"]),
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.warning(
                f"[CANDLES] Supabase read failed for {ticker}: {e} — falling back to yfinance"
            )

        logger.info(f"[CANDLES] Fetching 1Y daily candles from yfinance for {ticker}")
        candles = await asyncio.to_thread(_fetch_candles_sync, ticker, "1y", "1d")

        if candles:
            await self._upsert_daily_candles(ticker, candles)

        return candles

    async def _upsert_daily_candles(self, ticker: str, candles: list[dict]) -> None:
        rows = [
            {
                "ticker": ticker,
                "date": c["time"],
                "open": c["open"],
                "high": c["high"],
                "low": c["low"],
                "close": c["close"],
                "volume": int(c["volume"]),
            }
            for c in candles
        ]

        try:
            await (
                self.supabase.table("daily_candles")
                .upsert(rows, on_conflict="ticker,date")
                .execute()
            )
            logger.info(f"[CANDLES] Upserted {len(rows)} daily candles for {ticker}")
        except Exception as e:
            logger.error(f"[CANDLES] Failed to upsert daily candles for {ticker}: {e}")

    async def get_profile(self, ticker: str) -> dict:
        key = _redis_profile_key(ticker)
        cached = await self.redis.get(key)

        if cached:
            logger.debug(f"[PROFILE] Redis hit for {ticker}")
            return json.loads(cached)

        logger.info(f"[PROFILE] Fetching profile from yfinance for {ticker}")
        profile = await asyncio.to_thread(_fetch_profile_sync, ticker)

        await self.redis.set(key, json.dumps(profile), ex=3600)
        return profile
