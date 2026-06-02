import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from app.services.websocket_manager import ws_manager
from app.services.ticker_worker import TickerScraperService
from app.dependencies.supabase_client import get_supabase
from app.dependencies.redis_client import get_redis
from loguru import logger

router = APIRouter()

# TODO: REMOVE BEFORE COMMIT
TESTING = False


@router.websocket("/ws/prices")
async def websocket_prices_endpoint(websocket: WebSocket, token: str | None = None):
    # Instantly cut connections attempts without a token
    logger.info(
        f"[HANDSHAKE_ATTEMPT] Incoming connection. Token param captured: {token}"
    )
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    redis_client = get_redis()
    scraper = TickerScraperService(redis_client, max_sub_batch_size=40)

    if TESTING:
        user_id = token  # e.g., "mock_user_42"
        # User 0-33 follows AAPL/AMD, 34-66 follows NVDA, etc.
        user_index = int(user_id.split("_")[-1])
        if user_index % 4 == 0:
            user_tickers = ["AAPL", "AMD"]
        elif user_index % 4 == 1:
            user_tickers = ["NVDA", "MSFT"]
        elif user_index % 4 == 2:
            user_tickers = ["BABA", "XOM"]
        else:
            user_tickers = ["AAPL", "NVDA", "SOFI"]

        logger.warning(
            f"[TEST_MODE] Bypassing Auth for {user_id}. Portfolios: {user_tickers}"
        )
    else:
        try:
            # extract user portfolio scope from Supabase Auth
            supabase_client = await get_supabase()
            user_response = await supabase_client.auth.get_user(token)
            if not user_response or not user_response.user:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            user_id = user_response.user.id

            # pull the user's specific customized watch list tickers from your table
            portfolio_data = (
                await supabase_client.table("watchlist_stocks")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )

            logger.debug(f"[USER {user_id}]: {portfolio_data}")

            user_tickers = [row["stock_ticker"].upper() for row in portfolio_data.data]

        except Exception as err:
            logger.error(f"[WS_AUTH_ERROR] Auth/Portfolio initialization failed: {err}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await redis_client.sadd("portfolio:tickers", *user_tickers)

    await ws_manager.connect(websocket)

    # Sort the connection into its portfolio tracking rooms
    if user_tickers:
        ws_manager.subscribe_client_to_tickers(websocket, user_tickers)

        try:
            async with asyncio.timeout(0.25):  # 250ms max threshold limit
                cached_prices = await redis_client.hmget("stock:prices", user_tickers)
        except (asyncio.TimeoutError, Exception) as cache_err:
            logger.warning(
                f"[WS_INIT_CACHE_TIMEOUT] Redis hmget slowed down or failed: {cache_err}. Skipping initial catch-up payload."
            )
            cached_prices = None

        # check data inside Redis cache so the UI loads instantly
        initial_payload = {}
        if cached_prices:
            for ticker, data in zip(user_tickers, cached_prices):
                if data:
                    initial_payload[ticker] = (
                        json.loads(data) if isinstance(data, str) else data
                    )

            if initial_payload:
                await websocket.send_json(
                    {"type": "PRICE_UPDATE", "data": initial_payload}
                )

    # Listening Loop for Client-Side Actions (e.g., Adding a Ticker)
    try:
        while True:
            # payload travel up as raw string text
            raw_client_message = await websocket.receive_text()
            message_data = json.loads(raw_client_message)

            # check if the user is dispatching a new subscription command
            if message_data.get("action") == "SUBSCRIBE_TICKER":
                new_ticker = message_data.get("ticker", "").upper()
                if not new_ticker:
                    continue

                logger.info(
                    f"[WS_ACTION] User {user_id} requested stream subscription for: {new_ticker}"
                )

                # add ticker to tickers to track
                await redis_client.sadd("portfolio:tickers", new_ticker)
                # add client to ticker room
                ws_manager.subscribe_client_to_tickers(websocket, [new_ticker])

                cached_data = await redis_client.hmget("stock:prices", new_ticker)

                if cached_data:
                    # Cache Hit: Send straight down *only* this private socket pipeline
                    logger.debug(f"Cached Data: {cached_data}")
                    parsed_cache = (
                        json.loads(cached_data)
                        if isinstance(cached_data, str)
                        else cached_data
                    )
                    payload_to_send = {
                        "type": "PRICE_UPDATE",
                        "data": {new_ticker: parsed_cache},
                    }
                    logger.debug(f"Payload to send: {payload_to_send}")
                    await websocket.send_json(payload_to_send)
                else:
                    # Cache Miss: Trigger isolated ad-hoc scraping execution threads
                    fresh_adhoc_data = await scraper.scrape_and_cache_batch(
                        [new_ticker], is_clock_sweep=False
                    )
                    if fresh_adhoc_data and new_ticker in fresh_adhoc_data:
                        # send res privately to ws client
                        payload_to_send = {
                            "type": "PRICE_UPDATE",
                            "data": {new_ticker: fresh_adhoc_data[new_ticker]},
                        }

                        await websocket.send_json(payload_to_send)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
