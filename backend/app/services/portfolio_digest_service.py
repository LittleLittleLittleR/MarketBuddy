import asyncio
from dataclasses import dataclass, field
from typing import Optional
import yfinance as yf
import pandas as pd
from supabase import AsyncClient
from loguru import logger


@dataclass
class PositionSummary:
    ticker: str
    company_name: str
    quantity: float
    avg_price: float
    current_price: Optional[float]
    pnl_per_share: Optional[float]
    total_pnl: Optional[float]
    pnl_pct: Optional[float]
    ai_insight: Optional[str]


@dataclass
class TradeActivity:
    date: str
    side: str  # 'buy' | 'sell'
    ticker: str
    quantity: float
    price: float


@dataclass
class DigestPayload:
    total_value: float
    total_pnl: float
    positions: list[PositionSummary] = field(default_factory=list)
    monthly_trades: list[TradeActivity] = field(default_factory=list)


class PortfolioDigestService:
    def __init__(self, supabase_client: AsyncClient):
        self.supabase = supabase_client

    async def build_digest(
        self, user_id: str, month: int, year: int
    ) -> DigestPayload:
        # Fetch all portfolios owned by this user
        portfolios_resp = (
            await self.supabase.table("portfolios")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )
        portfolio_ids = [p["id"] for p in (portfolios_resp.data or [])]

        if not portfolio_ids:
            return DigestPayload(total_value=0.0, total_pnl=0.0)

        # Fetch all trades across all portfolios, oldest first so the cost-basis
        # loop processes buys/sells in chronological order
        trades_resp = (
            await self.supabase.table("trades")
            .select("ticker, side, quantity, entry_cost, trade_date, portfolio_id")
            .in_("portfolio_id", portfolio_ids)
            .order("trade_date", desc=False)
            .execute()
        )
        all_trades: list[dict] = trades_resp.data or []

        # Group trades by ticker across all portfolios
        ticker_trades: dict[str, list[dict]] = {}
        for trade in all_trades:
            ticker = trade["ticker"]
            ticker_trades.setdefault(ticker, []).append(trade)

        # Cost-basis algorithm ported from frontend/src/hooks/portfolio.ts:
        # BUY  → accumulate qty and total cost
        # SELL → compute avg before sell, reduce qty and cost proportionally
        open_positions: dict[str, dict] = {}
        for ticker, trades in ticker_trades.items():
            total_qty = 0.0
            average_sum = 0.0
            for trade in trades:
                qty = float(trade["quantity"])
                price = float(trade["entry_cost"])
                if trade["side"] == "buy":
                    average_sum += qty * price
                    total_qty += qty
                elif trade["side"] == "sell":
                    avg_before_sell = (average_sum / total_qty) if total_qty > 0 else 0.0
                    total_qty -= qty
                    average_sum = avg_before_sell * total_qty

            if total_qty > 0:
                open_positions[ticker] = {
                    "quantity": total_qty,
                    "avg_price": average_sum / total_qty,
                }

        monthly_trades = self._filter_monthly_trades(all_trades, month, year)

        if not open_positions:
            return DigestPayload(
                total_value=0.0,
                total_pnl=0.0,
                positions=[],
                monthly_trades=monthly_trades,
            )

        # Company names from Supabase; live prices fetched fresh at generation time
        tickers = list(open_positions.keys())
        stocks_resp = (
            await self.supabase.table("stocks")
            .select("ticker, company_name")
            .in_("ticker", tickers)
            .execute()
        )
        stocks: dict[str, dict] = {
            s["ticker"]: s for s in (stocks_resp.data or [])
        }

        fresh_prices = await self._fetch_current_prices(tickers)

        # Fetch the most recent AI summary per held ticker
        # We query all rows for these tickers ordered by created_at DESC and
        # keep only the first result per ticker.
        summaries_resp = (
            await self.supabase.table("summaries")
            .select("ticker, summary")
            .in_("ticker", tickers)
            .order("created_at", desc=True)
            .execute()
        )
        summaries: dict[str, str] = {}
        for row in (summaries_resp.data or []):
            if row["ticker"] not in summaries:
                summaries[row["ticker"]] = row["summary"]

        # Build position summaries and aggregate portfolio totals
        positions: list[PositionSummary] = []
        total_value = 0.0
        total_pnl = 0.0

        for ticker, pos in open_positions.items():
            stock = stocks.get(ticker)
            qty = pos["quantity"]
            avg_price = pos["avg_price"]
            current_price: Optional[float] = fresh_prices.get(ticker.upper())
            company_name: str = stock["company_name"] if stock else ticker

            pnl_per_share: Optional[float] = None
            total_pos_pnl: Optional[float] = None
            pnl_pct: Optional[float] = None

            if current_price is not None:
                pnl_per_share = current_price - avg_price
                total_pos_pnl = pnl_per_share * qty
                pnl_pct = (pnl_per_share / avg_price * 100) if avg_price != 0 else 0.0
                total_value += current_price * qty
                total_pnl += total_pos_pnl

            positions.append(
                PositionSummary(
                    ticker=ticker,
                    company_name=company_name,
                    quantity=qty,
                    avg_price=avg_price,
                    current_price=current_price,
                    pnl_per_share=pnl_per_share,
                    total_pnl=total_pos_pnl,
                    pnl_pct=pnl_pct,
                    ai_insight=summaries.get(ticker),
                )
            )

        positions.sort(key=lambda p: p.ticker)

        return DigestPayload(
            total_value=total_value,
            total_pnl=total_pnl,
            positions=positions,
            monthly_trades=monthly_trades,
        )

    async def _fetch_current_prices(self, tickers: list[str]) -> dict[str, float]:
        symbols = [t.upper() for t in tickers]
        if not symbols:
            return {}

        def _pull():
            return yf.download(
                " ".join(symbols),
                period="1d",
                group_by="ticker",
                progress=False,
                auto_adjust=True,
            )

        prices: dict[str, float] = {}
        try:
            data = await asyncio.to_thread(_pull)
        except Exception as err:
            logger.warning(f"[DIGEST_PRICE_FETCH] batch fetch failed: {err}")
            return prices

        is_multi = isinstance(data.columns, pd.MultiIndex)
        for symbol in symbols:
            try:
                frame = data[symbol].dropna() if is_multi else data.dropna()
                if frame.empty:
                    continue
                prices[symbol] = round(float(frame.iloc[-1]["Close"]), 2)
            except Exception:
                continue
        return prices

    async def get_open_tickers(self, user_id: str) -> set[str]:
        portfolios_resp = (
            await self.supabase.table("portfolios")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )
        portfolio_ids = [p["id"] for p in (portfolios_resp.data or [])]
        if not portfolio_ids:
            return set()

        trades_resp = (
            await self.supabase.table("trades")
            .select("ticker, side, quantity, entry_cost")
            .in_("portfolio_id", portfolio_ids)
            .order("trade_date", desc=False)
            .execute()
        )

        ticker_qty: dict[str, float] = {}
        ticker_cost: dict[str, float] = {}

        for trade in (trades_resp.data or []):
            ticker = trade["ticker"].upper()
            qty = float(trade["quantity"])
            ticker_qty.setdefault(ticker, 0.0)
            ticker_cost.setdefault(ticker, 0.0)

            if trade["side"] == "buy":
                ticker_cost[ticker] += qty * float(trade.get("entry_cost") or 0)
                ticker_qty[ticker] += qty
            elif trade["side"] == "sell":
                avg = (ticker_cost[ticker] / ticker_qty[ticker]) if ticker_qty[ticker] > 0 else 0.0
                ticker_qty[ticker] -= qty
                ticker_cost[ticker] = avg * ticker_qty[ticker]

        return {t for t, q in ticker_qty.items() if q > 0}

    def _filter_monthly_trades(
        self, trades: list[dict], month: int, year: int
    ) -> list[TradeActivity]:
        result: list[TradeActivity] = []
        for trade in trades:
            trade_date = trade.get("trade_date")
            if not trade_date:
                continue
            try:
                date_str = str(trade_date)[:10]  # "YYYY-MM-DD"
                t_year, t_month = int(date_str[:4]), int(date_str[5:7])
                if t_year == year and t_month == month:
                    result.append(
                        TradeActivity(
                            date=date_str,
                            side=trade["side"],
                            ticker=trade["ticker"],
                            quantity=float(trade["quantity"]),
                            price=float(trade["entry_cost"]),
                        )
                    )
            except (ValueError, IndexError, KeyError):
                continue
        return result
