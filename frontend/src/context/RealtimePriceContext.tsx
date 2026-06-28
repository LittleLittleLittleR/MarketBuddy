import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { PortfolioListDisplay, WatchlistStockDisplay } from '@/types/stock';

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected';

export type LatestPrice = {
  price: number;
  open: number | null;
  updated_at: string | null;
};

interface RealtimePriceContextType {
  status: ConnectionStatus;
  subscribeToTicker: (ticker: string) => void;
  latestPrices: Record<string, LatestPrice>;
}

type LivePriceUpdate = {
  price: number;
  open: number | null;
  updated_at?: string;
};

type LivePricePayload = Record<string, LivePriceUpdate | string>;

const RealtimePriceContext = createContext<RealtimePriceContextType | null>(null);

export const RealtimePriceProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const rwsRef = useRef<ReconnectingWebSocket | null>(null);
  const { session } = useAuth();

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [latestPrices, setLatestPrices] = useState<Record<string, LatestPrice>>({});
  const displayStatus = session?.access_token
    ? status === 'disconnected'
      ? 'connecting'
      : status
    : 'disconnected';

  useEffect(() => {
    if (status === 'connected') {
      toast.success('Live Terminal Connected', {
        description: 'Connected to Live Pricing Updates.',
        id: 'ws-status',
      });
    } else if (status === 'connecting' && rwsRef.current && rwsRef.current.retryCount > 0) {
      toast.loading('Reconnecting...', {
        description: `Attempting to re-establish pricing stream (Try ${rwsRef.current.retryCount}/5)...`,
        id: 'ws-status',
      });
    }
  }, [status]);

  useEffect(() => {
    if (!session?.access_token) {
      if (rwsRef.current) {
        rwsRef.current.close();
      }
      return;
    }

    const WS_URL = `wss://orbital-fastapi-backend-production.up.railway.app/ws/prices?token=${session.access_token}`
    // const WS_URL = `ws://localhost:8000/ws/prices?token=${session.access_token}`
    const rws = new ReconnectingWebSocket(WS_URL, [], {
      maxReconnectionDelay: 20000, // Caps exponential backoff at 10 seconds max
      minReconnectionDelay: 5000,  // Starts retrying after 5 second if connection drops
      reconnectionDelayGrowFactor: 1.5,
      maxRetries: 5,
    });

    rwsRef.current = rws;

    rws.onopen = () => {
      setStatus('connected')
      console.log('[RWS] Client WS connected.')
    };


    rws.onerror = (err) => {
      console.error('[RWS_ERROR] Connecting issue detected:', err);
      setStatus('error');
    };

    rws.onclose = (event) => {
      console.warn(`[RWS] Closed connection. Code: ${event.code}`);
      // If it closed because it maxed out retries, mark as error so UI can show a hard failure
      if (rws.retryCount >= 5) {
        setStatus('error');
      } else {
        setStatus('connecting'); // ReconnectingWebSocket auto-retries, so we are back to 'connecting'
      }
    };

    rws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'PRICE_UPDATE' && payload.data) {
          const incomingPrices: LivePricePayload = payload.data;
          // eg of payload
          // {'ticker': {
          //     'price': float,
          //     'opening_price': float,
          //     'updated_at': time.time() unix timestamp
          //     'status': 'SUCCESS' | 'FAILED' | 'PENDING'
          //      }
          //  }

          // update the raw latestPrices map so individual stock pages can read it
          setLatestPrices((prev) => {
            const next = { ...prev };
            for (const [ticker, update] of Object.entries(incomingPrices)) {
              let raw: unknown = update;
              if (Array.isArray(raw)) raw = raw[0];
              const normalized = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (normalized?.price != null) {
                next[ticker.toUpperCase()] = {
                  price: normalized.price,
                  open: normalized.open ?? null,
                  updated_at: normalized.updated_at ?? null,
                };
              }
            }
            return next;
          });

          // updates into TanStack Query's Cache
          queryClient.setQueryData<WatchlistStockDisplay[]>(['watchlistPrices'], (oldData) => {
            if (!oldData) return oldData;

            return oldData.map((stock) => {
              const liveUpdate = incomingPrices[stock.ticker.toUpperCase()];
              if (liveUpdate) {
                const normalizedUpdate = typeof liveUpdate === 'string' ? JSON.parse(liveUpdate) : liveUpdate;

                return {
                  ...stock,
                  current_price: normalizedUpdate.price,
                  open_price: normalizedUpdate.open,
                };
              }
              return stock;
            });
          });

          queryClient.setQueryData<PortfolioListDisplay[]>(['portfolioPrices'], (oldData) => {
            if (!oldData) return oldData;

            return oldData.map((portfolio) => ({
              ...portfolio,
              stocks: portfolio.stocks.map((stock) => {
                const liveUpdate = incomingPrices[stock.ticker.toUpperCase()];

                if (!liveUpdate) {
                  return stock;
                }

                const normalizedUpdate = typeof liveUpdate === 'string' ? JSON.parse(liveUpdate) : liveUpdate;

                return {
                  ...stock,
                  current_price: normalizedUpdate.price,
                  open_price: normalizedUpdate.open,
                };
              }),
            }));
          });
        }
      } catch (err) {
        console.error('[RWS_PARSE_ERROR]', err);
      }
    };

    return () => {
      if (rwsRef.current) {
        rwsRef.current.close();
      }
    };
  }, [session, queryClient]);

  const subscribeToTicker = useCallback((ticker: string) => {
    if (rwsRef.current && rwsRef.current.readyState === WebSocket.OPEN) {
      rwsRef.current.send(JSON.stringify({ action: 'SUBSCRIBE_TICKER', ticker: ticker.toUpperCase() }));
    }
  }, []);

  return (
    <RealtimePriceContext.Provider value={{ status: displayStatus, subscribeToTicker, latestPrices }}>
      {children}
    </RealtimePriceContext.Provider>
  );
};

export const useRealtimePrice = () => {
  const context = useContext(RealtimePriceContext);
  if (!context) {
    throw new Error('useRealtimePrice must be used within a RealtimePriceProvider');
  }
  return context;
}
