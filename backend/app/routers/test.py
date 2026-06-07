from fastapi import APIRouter
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/test", tags=["dev-testing"])


@router.post("/trigger-broadcast")
async def trigger_mock_broadcast(payload: dict):
    if not ws_manager.all_connections:
        return {"status": "skipped", "message": "No active WebSocket clients connected"}

    await ws_manager.broadcast_targeted_updates(payload)

    return {
        "status": "success",
        "tracked_rooms": list(ws_manager.ticker_subscriptions.keys()),
        "active_clients": len(ws_manager.all_connections),
    }
