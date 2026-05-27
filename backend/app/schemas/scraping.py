from pydantic import BaseModel, Field
from typing import List, Optional


class NewsArticle(BaseModel):
    # for base brightdata scraping
    title: str
    url: str
    snippet: Optional[str] = None


class ArticleSummary(BaseModel):
    # to return frontend
    title: str
    url: str
    summary: str


class StockReport(BaseModel):

    ticker: str
    count: int
    articles: List[ArticleSummary]


class StocksRequest(BaseModel):
    body: List[str]