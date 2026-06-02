import { useEffect, useRef } from 'react';
import type { WatchlistStockDisplay } from '@/types/stock';
import { useAuth } from '@/context/AuthContext';

interface Props {
  setWatchlist: React.Dispatch<React.SetStateAction<WatchlistStockDisplay[]>>;
  accessToken: string | undefined
}

const LiveStockPriceUpdater = ({ setWatchlist, accessToken }: Props) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!accessToken || accessToken === "undefined") return
    const WS_URL = `ws://localhost:8000/ws/prices?token=${accessToken}`;

    const connectWebSocket = () => {
      console.log("[WS] Connecting to stream line...");
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Production verification link completed successfully.");
        const testSub = {
          action: "SUBSCRIBE_TICKER",
          ticker: "AAPL"
        };
        ws.send(JSON.stringify(testSub));
        console.log("[WS] Sent forced subscription for AAPL");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log("Payload received: ", payload)
          if (payload.type === "PRICE_UPDATE" && payload.data) {
            const incomingPrices = payload.data;

            setWatchlist((prevWatchlist) =>
              prevWatchlist.map((stock) => {
                const updatedTickerData = incomingPrices[stock.ticker.toUpperCase()];
                if (updatedTickerData) {
                  return {
                    ...stock,
                    price: updatedTickerData.price,
                    opening_price: updatedTickerData.opening_price,
                  };
                }
                return stock;
              })
            );
          }
        } catch (err) {
          console.error("[WS_PARSING_ERROR] Failed decoding packet data stream:", err);
        }
      };

      ws.onclose = (event) => {
        console.warn(`[WS] Disconnected. Code: ${event.code}`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [setWatchlist, accessToken]); // ──► Add token to the dependency array so it fires once loaded

  return null;
};

export default LiveStockPriceUpdater;
