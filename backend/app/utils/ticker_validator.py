import re
from fastapi import HTTPException

_TICKER_RE = re.compile(r"^[A-Za-z.\-]{1,10}$")


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
