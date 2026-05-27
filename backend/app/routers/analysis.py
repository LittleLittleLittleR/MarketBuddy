from fastapi import APIRouter, Depends, HTTPException
from app.services.stock_analysis import StockAnalysisService
from app.dependencies import get_stock_service

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyse")
async def analyse_stock(
    ticker: str, service: StockAnalysisService = Depends(get_stock_service)
):
    links = await service.fetch_news_links(ticker)
    if not links:
        raise HTTPException(status_code=404, detail="No news found for this ticker.")
    context = "\n".join([f"[{a.title}: {a.snippet}" for a in links])
    return await service.scrape_and_summarise(context)
