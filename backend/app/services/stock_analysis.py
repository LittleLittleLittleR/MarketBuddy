import time
from brightdata import BrightDataClient
from typing import List
from openai import AsyncOpenAI
import asyncio
import httpx
from app.config import settings
from app.schemas.scraping import NewsArticle

headers = {
    "Authorization": f"Bearer {settings.brightdata_api_token}",
    "Content-Type": "application/json",
}


class StockAnalysisService:
    def __init__(self):
        self.bd_client = BrightDataClient(token=settings.brightdata_api_token)
        self.ai_client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def fetch_news_links(self, ticker: str) -> List[NewsArticle]:
        try:
            restricted_query = f"{ticker}+stock+news"

            # tbm=nws: news tab
            # tbs=qdr:d: Past 24 hours
            search_url = f"https://www.google.com/search?q={restricted_query}&tbm=nws&tbs=qdr:d&num=20"

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

    async def scrape_all_links(self, articles: List[NewsArticle]):
        for i, article in enumerate(articles):
            articleDump = article.model_dump()
            print("Article dump: ", articleDump)
            async with self.bd_client as client:
                result = await client.scrape_url(
                    url=articleDump["url"], response_format="raw"
                )

            print(f"=== URL {i+1}: {articles[i]} ===")
            print(f"  Success: {result.success}")
            print(f"  Status: {result.status}")
            if result.success and result.data:
                content_len = (
                    len(result.data)
                    if isinstance(result.data, str)
                    else len(str(result.data))
                )
                print(f"  Content length: {content_len} chars")
                print(f"  Preview: {str(result.data)[:100]}...")
            else:
                print(f"  Error: {result.error}")
            print()

    async def scrape_and_summarise(self, context: str):
        prompt = "You are a professional stock analysis that does deep research into stock movement and news. With all news about the following stock Information. Return 'Summary: [text]'. Tell me everything that happened based on the context. Always ensure that the data is verified before returning the result. Give me ALL the key points within the summary"

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

        # print("Scrape and Summarise Response: ", ai_text)
        return ai_text
