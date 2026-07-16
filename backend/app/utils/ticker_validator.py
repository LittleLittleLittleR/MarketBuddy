import re
import asyncio
import yfinance as yf
from fastapi import HTTPException
from loguru import logger

_TICKER_RE = re.compile(r"^[A-Za-z.\-]{1,10}$")

_VALID_TTL_SECONDS = 604800
_INVALID_TTL_SECONDS = 3600


def validate_ticker(ticker: str) -> str:
    """
    Validates a stock ticker symbol against a safe regex pattern.
    Raises HTTP 400 on anything that doesn't match — prevents Redis key injection / yfinance abuse.
    Returns the ticker uppercased.
    """
    if not _TICKER_RE.match(ticker):
        raise HTTPException(
            status_code=400, detail=f"Invalid ticker symbol: '{ticker}'"
        )
    return ticker.upper()


def is_valid_ticker_format(ticker: str) -> bool:
    return bool(_TICKER_RE.match(ticker))


def _probe_ticker(ticker: str) -> bool:
    try:
        df = yf.download(
            ticker, period="5d", progress=False, auto_adjust=True
        )
        return not df.empty
    except Exception as err:
        logger.warning(f"[TICKER_PROBE] {ticker} lookup failed: {err}")
        return False


async def ticker_exists(redis_client, ticker: str) -> bool:
    if not is_valid_ticker_format(ticker):
        return False

    cache_key = f"ticker:valid:{ticker}"
    cached = await redis_client.get(cache_key)
    if cached is not None:
        return cached == "1"

    exists = await asyncio.to_thread(_probe_ticker, ticker)
    await redis_client.set(
        cache_key,
        "1" if exists else "0",
        ex=_VALID_TTL_SECONDS if exists else _INVALID_TTL_SECONDS,
    )
    return exists
