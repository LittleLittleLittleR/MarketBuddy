import asyncio
import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import InstanceOf
from app.services.stock_analysis import StockAnalysisService
from app.dependencies import get_stock_service
from app.schemas.scraping import StocksRequest
from time import perf_counter

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyse-stocks")
async def analyse_stocks(
    stocks: StocksRequest, service: StockAnalysisService = Depends(get_stock_service)
):  # takes in a list containing stocks required to scrape and summarise
    print("Received: ", stocks)

    start = perf_counter()

    # helper function
    async def analyse_one(ticker: str):
        links = await service.fetch_news_links(ticker=ticker)
        if not links:
            print("HTTPException for: ", ticker)
            raise HTTPException(
                status_code=404, detail=f"No news found for ticker: {ticker}"
            )
        context = "\n".join([f"[{a.title}: {a.snippet}" for a in links])
        return await service.scrape_and_summarise(context)

    results = await asyncio.gather(
        *[analyse_one(t) for t in stocks.body], return_exceptions=True
    )

    response = []
    # check if got any exceptions
    for res in results:
        if not isinstance(res, Exception):
            response.append(res)
        else:
            print(f"Error type: {type(res).__name__}")
            print(f"Error message: {str(res)}")
            print(
                f"Full traceback:\n{''.join(traceback.format_exception(type(res), res, res.__traceback__))}"
            )

    end = perf_counter()

    # track performance for time taken

    print("============================================")
    print(f"Elapsed time: {end - start:.6f} seconds")
    print("============================================")
    return response
