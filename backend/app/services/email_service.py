import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
import resend
from jinja2 import Environment, FileSystemLoader

from app.config import settings
from app.services.portfolio_digest_service import DigestPayload

_TEMPLATE_DIR = Path(__file__).parent.parent / "templates"


def generate_unsubscribe_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "purpose": "unsubscribe",
        "exp": datetime.now(timezone.utc) + timedelta(days=90),
    }
    return jwt.encode(payload, settings.SUPABASE_SECRET_KEY, algorithm="HS256")


def _render_and_send(
    user_email: str, digest: DigestPayload, month_label: str, user_id: str
) -> None:
    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=True,
    )
    template = env.get_template("monthly_digest.html")
    unsubscribe_token = generate_unsubscribe_token(user_id)
    html = template.render(
        digest=digest,
        month_label=month_label,
        unsubscribe_token=unsubscribe_token,
    )

    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send(
        {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [user_email],
            "subject": f"Your Portfolio Summary — {month_label}",
            "html": html,
        }
    )


async def send_monthly_digest(
    user_email: str, digest: DigestPayload, month_label: str, user_id: str
) -> None:
    # Resend SDK is synchronous; run it in a thread to avoid blocking the event loop
    await asyncio.to_thread(_render_and_send, user_email, digest, month_label, user_id)
