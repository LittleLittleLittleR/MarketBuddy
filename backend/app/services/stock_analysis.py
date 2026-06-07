from app.utils.time_utils import sg_time_now
from brightdata import BrightDataClient
from typing import List
from openai import AsyncOpenAI
import httpx
from upstash_redis.asyncio import Redis
from loguru import logger
import json

from app.repositories.summary_repo import SummaryRepository
from app.config import settings
from app.schemas.scraping import NewsArticle
from datetime import datetime, timezone
from app.services.tts_service import generate_audio
from app.services.video_builder import build_video
from app.dependencies.s3_client import upload_bytes

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

    async def generate_tts_script(self, ticker: str, context: str) -> str:
        """Short ~50 word script optimised for spoken TTS audio."""
        response = await self.ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a stock market news reporter. Write a 50 to 100 word spoken script "
                        f"for a 20-second daily recap video about {ticker} given the news and context"
                        "provided. DO NOT make it too generic, add some details and numbers from given news"
                        "Plain conversational English only. Do not mention anything about the prompt"
                        "No bullet points, no markdown, no symbols. "
                        "Write exactly as it will be spoken aloud."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Today's news for {ticker}:\n{context}",
                },
            ],
        )
        return response.choices[0].message.content or ""

    async def generate_daily_video(self, ticker: str, context: str):
        """Script → TTS audio → video → S3 → Redis key."""
        ticker_upper = ticker.upper()
        try:
            # generate short tts script
            script = await self.generate_tts_script(ticker_upper, context)
            if not script:
                logger.warning(f"[VIDEO] Empty script for {ticker_upper}, skipping")
                return

            logger.debug(f"TTS Script for ${ticker_upper} video: {script}")
            # pull cached price from Redis
            price, change_pct = None, None
            try:
                cached = await self.redis_client.hmget("stock:prices", ticker_upper)
                logger.debug(f"Cached price for {ticker_upper} found: {cached}")
                if cached and cached[0]:
                    raw = (
                        cached[0] if isinstance(cached[0], str) else cached[0].decode()
                    )
                    data = json.loads(raw)
                    price = data.get("price")
                    opening = data.get("opening_price")
                    if price and opening and opening > 0:
                        change_pct = round((price - opening) / opening * 100, 2)
            except Exception as e:
                logger.warning(f"[VIDEO] Price fetch failed for {ticker_upper}: {e}")

            # generate TTS → audio bytes
            audio_bytes = await generate_audio(script)

            # use Pillow + FFmpeg → video bytes
            video_bytes = await build_video(ticker_upper, audio_bytes)

            # upload to S3
            date = sg_time_now().strftime("%Y-%m-%d")
            s3_key = f"daily/{ticker_upper}/{date}.mp4"
            await upload_bytes(video_bytes, s3_key, "video/mp4")

            # store S3 key in Redis to generate presigned urls
            try:
                await self.redis_client.set(
                    f"stock:{ticker_upper}:video:daily",
                    s3_key,
                    ex=86400,  # expires after 24h
                )
            except Exception as e:
                logger.exception(f"Error occured while setting stock video key: {e}")

            logger.success(f"[VIDEO] Done for {ticker_upper} → {s3_key}")

        except Exception as e:
            logger.exception(f"[VIDEO] Failed for {ticker_upper}: {e}")
