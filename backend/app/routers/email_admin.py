import hmac
from typing import Optional

import jwt
from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import HTMLResponse
from loguru import logger
from pydantic import BaseModel

from app.config import settings
from app.dependencies.supabase_client import get_supabase
from app.repositories.email_job_repo import EmailJobRepository

router = APIRouter(tags=["email"])


class TriggerDigestRequest(BaseModel):
    user_id: Optional[str] = None
    month: int
    year: int


@router.post("/api/admin/trigger-monthly-digest")
async def trigger_monthly_digest(
    body: TriggerDigestRequest,
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
):
    if not x_admin_secret or not hmac.compare_digest(x_admin_secret, settings.ADMIN_SECRET):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    supabase = await get_supabase()
    repo = EmailJobRepository(supabase)

    if body.user_id:
        user_ids = [body.user_id]
    else:
        # Queue jobs for all opted-in users
        all_users = await supabase.auth.admin.list_users()
        all_user_ids = [u.id for u in (all_users if isinstance(all_users, list) else [])]

        prefs_resp = (
            await supabase.table("email_preferences")
            .select("user_id")
            .eq("monthly_digest_enabled", False)
            .execute()
        )
        opted_out = {row["user_id"] for row in (prefs_resp.data or [])}
        user_ids = [uid for uid in all_user_ids if uid not in opted_out]

    jobs_created = await repo.create_jobs_for_month(user_ids, body.month, body.year)
    logger.info(
        f"[EMAIL_ADMIN] trigger-monthly-digest: {jobs_created} jobs queued for {body.month}/{body.year}"
    )
    return {"jobs_created": jobs_created}


@router.get("/api/email/unsubscribe", response_class=HTMLResponse)
async def unsubscribe(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_SECRET_KEY,
            algorithms=["HS256"],
        )
        if payload.get("purpose") != "unsubscribe":
            raise ValueError("Invalid token purpose")
        user_id: str = payload["user_id"]
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, KeyError):
        return HTMLResponse(
            content=_page("Invalid link", "This unsubscribe link is invalid or has expired."),
            status_code=400,
        )

    supabase = await get_supabase()
    await (
        supabase.table("email_preferences")
        .upsert(
            {"user_id": user_id, "monthly_digest_enabled": False},
            on_conflict="user_id",
        )
        .execute()
    )

    logger.info(f"[EMAIL] user_id={user_id} unsubscribed from monthly digest")
    return HTMLResponse(content=_page("Unsubscribed", "You've been unsubscribed from monthly portfolio summaries."))


def _page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:80px 24px;">
        <div style="max-width:440px;background:#161b27;border-radius:12px;padding:48px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">MarketBuddy</p>
          <p style="margin:0 0 24px;font-size:26px;font-weight:700;color:#ffffff;">{title}</p>
          <p style="margin:0;font-size:15px;color:#9ca3af;line-height:1.6;">{message}</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>"""
