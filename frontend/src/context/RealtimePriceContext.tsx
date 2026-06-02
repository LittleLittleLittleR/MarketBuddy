import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected';

interface RealtimePriceContextType {
  status: ConnectionStatus;
  subscribeToTicker: (ticker: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RealtimePriceContext = createContext<RealtimePriceContextType | null>(null);

export const RealtimePriceProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const rwsRef = useRef<ReconnectingWebSocket | null>(null);
  const { session } = useAuth();

  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (status === 'connected') {
      toast.success('Live Terminal Connected', {
        description: 'Connected to Live Pricing Updates.',
        id: 'ws-status',
      });
    } else if (status === 'error') {
      toast.error('Connection Failed', {
        description: 'Max reconnection limits exceeded. Live pricing updates paused.',
        id: 'ws-status',
        duration: Infinity,
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
      setStatus("disconnected");
      return;
    };

    setStatus("connecting")

    const WS_URL = `ws://${API_BASE_URL}/ws/prices?token=${session.access_token}`;
    const rws = new ReconnectingWebSocket(WS_URL, [], {
      maxReconnectionDelay: 20000, // Caps exponential backoff at 10 seconds max
      minReconnectionDelay: 5000,  // Starts retrying after 5 second if connection drops
      reconnectionDelayGrowFactor: 1.5,
      maxRetries: 5,
    });

    rwsRef.current = rws;

    rws.onopen = () => {
      setStatus("connected")
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
          const incomingPrices = payload.data;
          // eg of payload
          // {'ticker': {
          //     'price': float,
          //     'opening_price': float,
          //     'updated_at': time.time() unix timestamp
          //     'status': 'SUCCESS' | 'FAILED' | 'PENDING'
          //      }
          //  }

          // updates into TanStack Query's Cache
          queryClient.setQueryData(['watchlistPrices'], (oldData: any) => {
            if (!oldData) return oldData;
            console.log("oldData: ", oldData)

            return oldData.map((stock: any) => {
              const liveUpdate = incomingPrices[stock.ticker.toUpperCase()];
              if (liveUpdate) {
                return {
                  ...stock,
                  price: typeof liveUpdate === 'string' ? JSON.parse(liveUpdate).price : liveUpdate.price,
                  opening_price: typeof liveUpdate === 'string' ? JSON.parse(liveUpdate).opening_price : liveUpdate.opening_price,
                };
              }
              return stock;
            });
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

  const subscribeToTicker = (ticker: string) => {
    if (rwsRef.current && rwsRef.current.readyState === WebSocket.OPEN) {
      rwsRef.current.send(JSON.stringify({ action: 'SUBSCRIBE_TICKER', ticker: ticker.toUpperCase() }));
    }
  };

  return (
    <RealtimePriceContext.Provider value={{ status, subscribeToTicker }}>
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
