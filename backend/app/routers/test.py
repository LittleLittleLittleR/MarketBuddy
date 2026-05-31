from fastapi import APIRouter, HTTPException
from app.services.websocket_manager import ws_manager
from app.dependencies.redis_client import get_redis
import os

router = APIRouter(prefix="/api/test", tags=["dev-testing"])


@router.post("/trigger-broadcast")
async def trigger_mock_broadcast(payload: dict):
    """
    Bypasses yfinance and lets you post ANY mock market data directly
    into your production ws_manager to test how it routes to users.
    """

    if not ws_manager.all_connections:
        return {"status": "skipped", "message": "No active WebSocket clients connected"}

    # Pass your mock dictionary straight into your real production broadcast engine!
    await ws_manager.broadcast_targeted_updates(payload)

    return {
        "status": "success",
        "tracked_rooms": list(ws_manager.ticker_subscriptions.keys()),
        "active_clients": len(ws_manager.all_connections),
    }
