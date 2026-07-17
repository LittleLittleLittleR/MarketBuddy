import asyncio
import json
from fastapi import WebSocket
from typing import Dict, Set, List
from loguru import logger

from app.utils.time_utils import last_market_close, is_market_open, annotate_freshness

"""
TYPE: PING | PRICE_UPDATE
ACTION: SUBSCRIBE_TICKER
"""


class TickerConnectionManager:
    def __init__(self):
        # rooms mapping a ticker string to a set of active connections
        # Example: {"AMD": {ws1, ws2}, "NVDA": {ws2, ws3}}
        self.ticker_subscriptions: Dict[str, Set[WebSocket]] = {}

        # set tracking all open sockets
        self.all_connections: Set[WebSocket] = set()

        # background task for the proxy keep-alive ping loop
        self._heartbeat_task = None

    async def connect(self, websocket: WebSocket):
        """Accepts the raw socket and registers it into the system guard."""
        await websocket.accept()
        self.all_connections.add(websocket)
        logger.success(
            f"[WS] New client connection accepted. Total active screens: {len(self.all_connections)}"
        )

        # keep-alive loop if it isn't currently running
        # none means just initialised,
        # done() means crash/reset
        if self._heartbeat_task is None or self._heartbeat_task.done():
            self._heartbeat_task = asyncio.create_task(
                self._ping_proxy_heartbeat_loop()
            )

    def subscribe_client_to_tickers(self, websocket: WebSocket, tickers: List[str]):
        """Dynamically registers a client's socket instance into specific ticker rooms."""
        """check 
           for each ticker -> if already got room 
           if got room -> add websocket into the ticker room to receive broadcasts for that ticker
           if no room -> create the room -> add ws into ticker room...
        """
        for ticker in tickers:
            ticker_upper = ticker.upper()
            if ticker_upper not in self.ticker_subscriptions:
                logger.debug(
                    f"{ticker_upper}'s room not intialised. Initialising now..."
                )
                self.ticker_subscriptions[ticker_upper] = set()
            logger.debug(f"Adding [WS] Client into room for: {ticker}")
            self.ticker_subscriptions[ticker_upper].add(websocket)
        logger.debug(f"[WS] Client successfully joined rooms: {tickers}")

    def disconnect(self, websocket: WebSocket):
        """removes/scrubs a dead socket out of memory to prevent memory leaks."""
        if websocket in self.all_connections:
            self.all_connections.remove(websocket)

        # Remove socket from every individual stock room it was listening to
        for ticker, clients in list(self.ticker_subscriptions.items()):
            if websocket in clients:
                clients.remove(websocket)
            if not clients:
                del self.ticker_subscriptions[ticker]

        logger.info(
            f"[WS] Client completely removed. Remaining active screens: {len(self.all_connections)}"
        )

    async def broadcast_targeted_updates(self, fresh_prices: dict):
        """
        workflow:
        1. create a dict, key is WS, val is what to send them
        2. for each ticker room, check if got any ws listening,
            if have, then add the fresh ticker data into the ws payload
        3. fire up async tasks to broadcast to the connected ws
        """

        client_payloads: Dict[WebSocket, Dict[str, dict]] = {}

        last_close = last_market_close()
        market_open = is_market_open()

        # go through fresh_data scraped
        for ticker, stock_data in fresh_prices.items():
            ticker_upper = ticker.upper()

            # check if any ws listening to ticker room
            if ticker_upper in self.ticker_subscriptions:
                entry = json.loads(stock_data) if isinstance(stock_data, str) else stock_data
                entry = annotate_freshness(entry, last_close, market_open)
                for client in self.ticker_subscriptions[ticker_upper]:
                    if client not in client_payloads:
                        client_payloads[client] = {}

                    # append stock_data to this specific user's minute update chunk
                    client_payloads[client][ticker_upper] = entry

        # mass broadcast over async task
        if client_payloads:
            logger.debug("[broadcast_targeted_updates] Starting Broadcasting...")
            logger.debug(
                f"[broadcast_targeted_updates] client payloads are: {client_payloads}"
            )
            await asyncio.gather(
                *[
                    self._send_tailored_json(client, payload)
                    for client, payload in client_payloads.items()
                ],
                return_exceptions=True,
            )

    async def _send_tailored_json(self, ws: WebSocket, payload: dict):
        try:
            await ws.send_json({"type": "PRICE_UPDATE", "data": payload})
        except Exception:
            self.disconnect(ws)

    async def _ping_proxy_heartbeat_loop(self):
        """Keeps the TCP pipe warm through Railway's proxy during quiet/weekend market hours."""
        while True:
            await asyncio.sleep(30)
            if self.all_connections:
                logger.debug(
                    f"[WS_HEARTBEAT] Sending PING frame to {len(self.all_connections)} clients..."
                )
                await asyncio.gather(
                    *[
                        ws.send_json({"type": "PING"})
                        for ws in list(self.all_connections)
                    ],
                    return_exceptions=True,
                )


ws_manager = TickerConnectionManager()
