from pydantic import BaseModel
from typing import Union


class Candle(BaseModel):
    # intraday candles use a UNIX timestamp (int), daily candles use "YYYY-MM-DD" (str)
    time: Union[int, str]
    open: float
    high: float
    low: float
    close: float
    volume: float


class CandleResponse(BaseModel):
    ticker: str
    range: str
    interval: str
    candles: list[Candle]


class StockProfile(BaseModel):
    ticker: str
    company_name: str | None = None
    currency: str | None = None
    exchange: str | None = None
    market_cap: float | None = None
    pe_ratio: float | None = None
    eps: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    volume: int | None = None
    avg_volume: int | None = None
    dividend_yield: float | None = None
    sector: str | None = None
