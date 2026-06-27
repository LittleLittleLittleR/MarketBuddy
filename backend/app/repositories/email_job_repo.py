from datetime import datetime
from supabase import AsyncClient


class EmailJobRepository:
    def __init__(self, supabase_client: AsyncClient):
        self.supabase = supabase_client

    async def create_jobs_for_month(
        self, user_ids: list[str], month: int, year: int
    ) -> int:
        if not user_ids:
            return 0
        rows = [{"user_id": uid, "month": month, "year": year} for uid in user_ids]
        response = (
            await self.supabase.table("email_job_queue")
            .upsert(rows, on_conflict="user_id,month,year", ignore_duplicates=True)
            .execute()
        )
        return len(response.data) if response.data else 0

    async def fetch_pending_batch(self, limit: int = 20) -> list[dict]:
        response = (
            await self.supabase.table("email_job_queue")
            .select("*")
            .eq("status", "pending")
            .limit(limit)
            .execute()
        )
        return response.data or []

    async def mark_sent(self, job_id: int, sent_at: datetime) -> None:
        await (
            self.supabase.table("email_job_queue")
            .update({"status": "sent", "sent_at": sent_at.isoformat()})
            .eq("id", job_id)
            .execute()
        )

    async def mark_failed(
        self, job_id: int, error: str, current_retry_count: int
    ) -> None:
        new_count = current_retry_count + 1
        # Dead-letter after 3 attempts
        new_status = "failed" if new_count >= 3 else "pending"
        await (
            self.supabase.table("email_job_queue")
            .update(
                {
                    "status": new_status,
                    "retry_count": new_count,
                    "error_message": error[:500],
                }
            )
            .eq("id", job_id)
            .execute()
        )
