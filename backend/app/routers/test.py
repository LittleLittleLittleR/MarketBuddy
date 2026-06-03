from fastapi import APIRouter, HTTPException, Depends
from app.services.websocket_manager import ws_manager
from app.services.stock_analysis import StockAnalysisService
from app.dependencies import get_stock_service

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


@router.post("/generate-video/{ticker}")
async def test_generate_video(
    ticker: str,
    service: StockAnalysisService = Depends(get_stock_service),
):
    links = await service.fetch_news_links(ticker=ticker)
    if not links:
        return {"status": "no news found", "ticker": ticker}

    context = "\n".join([f"[{a.title}: {a.snippet}]" for a in links])
    await service.generate_daily_video(ticker, context)
    return {"status": "done", "ticker": ticker}
