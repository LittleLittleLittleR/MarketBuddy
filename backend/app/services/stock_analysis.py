import time
from brightdata import BrightDataClient
from typing import List
from openai import AsyncOpenAI
import asyncio
import httpx
from app.config import settings
from app.schemas.scraping import NewsArticle
from upstash_redis.asyncio import Redis
from supabase import AsyncClient

headers = {
    "Authorization": f"Bearer {settings.brightdata_api_token}",
    "Content-Type": "application/json",
}


class StockAnalysisService:
    def __init__(self, redis_client: Redis, supabase_client: AsyncClient):
        self.bd_client = BrightDataClient(token=settings.brightdata_api_token)
        self.ai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.redis_client = redis_client
        self.supabase_client = supabase_client

    async def fetch_news_links(self, ticker: str) -> List[NewsArticle]:
        try:
            restricted_query = f"{ticker}+stock+news"

            # tbm=nws: news tab
            # tbs=qdr:d: Past 24 hours
            search_url = (
                f"https://www.google.com/search?q={restricted_query}&tbm=nws&tbs=qdr:d"
            )

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
                print(f"No news found for {ticker}")
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

            print(f"Successfully fetched {len(articles)} links for {ticker}")
            return articles
        except Exception as e:
            raise RuntimeError(f"Failed to fetch news for {ticker}: {e}") from e

    async def scrape_and_summarise(self, ticker: str, context: str):
        prompt = f"You are a professional stock analysis that does deep research into stock movement and news of {ticker}. With all news snippets about the following stock Information. Return 'Summary: [text]'. Tell me everything that happened based on the context. Always ensure that the data is verified before returning the result. Give me ALL the key points within the summary"

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
            cache_key = f"stock:{ticker.upper()}:summary:daily"
            await self.redis_client.set(cache_key, ai_text, ex=86400)
        except Exception as e:
            raise RuntimeError(f"Failed to save daily summary for {ticker}: {e}") from e

        return ai_text

    async def save_daily_summary(self, ticker: str, summary_text: str):
        ticker_upper = ticker.upper()

        if self.redis_client:
            cache_key = f"stock:{ticker_upper}:summary:daily"
            self.redis_client.set(cache_key, summary_text, ex=86400)

        return

        # still need to configure db
        if self.supabase_client:
            await self.supabase_client.table("summaries").insert(
                {"ticker": ticker_upper, "summary": summary_text}
            ).execute()
