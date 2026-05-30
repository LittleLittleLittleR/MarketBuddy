from brightdata import BrightDataClient
from typing import List
from openai import AsyncOpenAI
import httpx
from upstash_redis.asyncio import Redis
from loguru import logger

from app.repositories.summary_repo import SummaryRepository
from app.config import settings
from app.schemas.scraping import NewsArticle

headers = {
    "Authorization": f"Bearer {settings.BRIGHTDATA_API_TOKEN}",
    "Content-Type": "application/json",
}


class StockAnalysisService:
    def __init__(
        self,
        redis_client: Redis,
        summary_repository: SummaryRepository,
    ):
        self.bd_client = BrightDataClient(token=settings.BRIGHTDATA_API_TOKEN)
        self.ai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.redis_client = redis_client
        self.summary_repository = (
            summary_repository  # for data access on supabase summaries table
        )

    async def fetch_news_links(self, ticker: str) -> List[NewsArticle]:
        max_retries = 3
        for i in range(max_retries):
            logger.debug(f"Retries for {ticker}: {i+1}/3")
            try:
                restricted_query = f"{ticker}+stock+news"

                # tbm=nws: news tab
                # tbs=qdr:d: Past 24 hours
                search_url = f"https://www.google.com/search?q={restricted_query}&tbm=nws&tbs=qdr:d"

                data = {
                    "url": search_url,
                    "format": "raw",
                    "zone": settings.BRIGHTDATA_SERP_ZONE,
                }

                async with httpx.AsyncClient(timeout=15) as client:
                    response = await client.post(
                        "https://api.brightdata.com/request", json=data, headers=headers
                    )

                res_json = response.json()
                news_results = res_json.get("news", [])

                # fallback if got nothing
                if not news_results:
                    news_results = res_json.get("organic", [])

                # check if got result again, if dh then return empty list
                if not news_results:
                    logger.warning(f"No news found for {ticker}")
                    return []

                articles = []
                for item in news_results:
                    article = NewsArticle(
                        title=item.get("title", "Untitled"),
                        url=item.get("link", ""),
                        snippet=item.get("description", item.get("snippet", "")),
                    )

                    if article.url:
                        articles.append(article)

                logger.success(
                    f"Successfully fetched {len(articles)} links for {ticker}"
                )
                return articles
            except Exception as e:
                # raise RuntimeError(f"Failed to fetch news for {ticker}: {e}") from e
                logger.exception(
                    f"Error occured while fetching news for {ticker}: {e}\n\nRetrying...(Attempt {i+1}/3)"
                )

        logger.warning(
            "[STOCK_ANALYSIS:FETCH_NEWS_LINKS] Unable to fetch news for {ticker}"
        )
        return []

    async def scrape_and_summarise(self, ticker: str, context: str):
        prompt = f"You are a professional stock analysis that does deep research into stock movement and news of {ticker}. With all news snippets about the following stock Information. Return '[text]'. Tell me everything that happened based on the context. Always ensure that the data is verified before returning the result. Give me ALL the key points within the summary"

        # return context
        response = await self.ai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": f"Here is the following news in the last 24hours \n\nContent: {context}",
                },
            ],
        )

        ai_text = response.choices[0].message.content
        if ai_text is None:
            ai_text = ""
        try:
            await self.save_daily_summary(ticker=ticker, summary_text=ai_text)
        except Exception as e:
            logger.exception(f"Failed to save daily summary for {ticker}: {e}")

        return ai_text

    async def save_daily_summary(self, ticker: str, summary_text: str):
        ticker_upper = ticker.upper()

        if self.redis_client:
            cache_key = f"stock:{ticker_upper}:summary:daily"
            try:
                await self.redis_client.set(cache_key, summary_text, ex=86400)
            except Exception as e:
                logger.exception(
                    f"[STOCK_ANALYSIS:SAVE_DAILY_SUMMARY] Failed to insert daily summary into Redis for {ticker}: {e}"
                )

        if self.summary_repository:
            try:
                await self.summary_repository.upsert_summary(
                    ticker=ticker, summary_text=summary_text
                )
            except Exception as e:
                logger.exception(
                    f"[STOCK_ANALYSIS:SAVE_DAILY_SUMMARY] Failed to upsert daily summary into Supabase for {ticker}: {e}"
                )
