from supabase import AsyncClient
from loguru import logger


class EarningsRepository:
    def __init__(self, supabase_client: AsyncClient):
        self.supabase = supabase_client

    async def upsert_earnings(self, data: dict) -> None:
        ticker = data.get("ticker")
        row = {
            "ticker": ticker,
            "earnings_date": data.get("earnings_date"),
            "eps_estimate": data.get("eps_estimate"),
            "eps_actual": data.get("eps_actual"),
            "eps_surprise_pct": data.get("eps_surprise_pct"),
            "revenue_actual": data.get("revenue_actual"),
            "operating_income": data.get("operating_income"),
            "gross_margin": data.get("gross_margin"),
            "operating_margin": data.get("operating_margin"),
            "last_updated": data.get("last_updated"),
        }

        try:
            await (
                self.supabase.table("earnings")
                .upsert(row, on_conflict="ticker")
                .execute()
            )
            logger.info(f"[EARNINGS_REPO] Upserted earnings for {ticker}")
        except Exception as e:
            logger.error(f"[EARNINGS_REPO] Failed to upsert earnings for {ticker}: {e}")

    async def get_earnings(self, ticker: str) -> dict | None:
        try:
            resp = (
                await self.supabase.table("earnings")
                .select("*")
                .eq("ticker", ticker)
                .single()
                .execute()
            )
            return resp.data
        except Exception as e:
            logger.warning(f"[EARNINGS_REPO] No Supabase record for {ticker}: {e}")
            return None
