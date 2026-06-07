import asyncio
import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import InstanceOf
from app.config import settings
from app.dependencies.auth import get_current_user
from app.services.stock_analysis import StockAnalysisService
from app.dependencies import get_stock_service
from app.schemas.scraping import StocksRequest
from time import perf_counter
from loguru import logger

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyse-stocks")
async def analyse_stocks(
    stocks: StocksRequest,
    service: StockAnalysisService = Depends(get_stock_service),
    current_user=Depends(get_current_user),
):  # takes in a list containing stocks required to scrape and summarise
    logger.success(
        f"[ANALYSE-STOCKS] Received request from {current_user.get('email')}"
    )

    start = perf_counter()

    # helper function
    async def analyse_one(ticker: str):

        # check if already in redis cache
        cache_key = f"stock:{ticker.upper()}:summary:daily"
        cached_record = await service.redis_client.get(cache_key)
        if cached_record:
            logger.success(f"Cached record for {ticker} found!")
            return cached_record
        else:
            logger.warning(
                f"No cached record found for {ticker}! Performing scraping now..."
            )

        links = await service.fetch_news_links(ticker=ticker)
        if not links:
            logger.warning("HTTPException for: ", ticker)
            return f"No news for the last 24 hours for {ticker}"

        context = "\n".join([f"[{a.title}: {a.snippet}" for a in links])

        if settings.DEBUG:
            print()
            print("Context: ")
            print(context)
            print()
        return await service.scrape_and_summarise(ticker, context)

    results = await asyncio.gather(
        *[analyse_one(t) for t in stocks.tickers], return_exceptions=True
    )

    response = []
    # check if got any exceptions
    for res in results:
        if not isinstance(res, Exception):
            response.append(res)
        else:
            logger.debug(f"Error type: {type(res).__name__}")
            logger.debug(f"Error message: {str(res)}")
            logger.debug(
                f"Full traceback:\n{''.join(traceback.format_exception(type(res), res, res.__traceback__))}"
            )

    end = perf_counter()

    # track performance for time taken

    logger.debug(f"Elapsed time: {end - start:.6f} seconds")
    return response
