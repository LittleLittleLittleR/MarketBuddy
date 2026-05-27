from functools import lru_cache
from app.services.stock_analysis import StockAnalysisService

# functionality of this file is so that we share all instances of classes, dont need keep reinitialising


@lru_cache
def get_stock_service() -> StockAnalysisService:
    return StockAnalysisService()
