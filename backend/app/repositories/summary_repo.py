from supabase import AsyncClient
from datetime import datetime, timezone


# to store data access layer for summaries table in supabase
class SummaryRepository:
    def __init__(self, supabase_client: AsyncClient):
        self.supabase = supabase_client

    async def upsert_summary(self, ticker: str, summary_text: str) -> dict:
        ticker_upper = ticker.upper()
        today_date = datetime.now(timezone.utc).date().isoformat()
        response = (
            await self.supabase.table("summaries")
            .upsert(
                {
                    "ticker": ticker_upper,
                    "summary": summary_text,
                    "summary_date": today_date,
                },
                on_conflict="ticker, summary_date",
            )
            .execute()
        )

        return response.data
