import { supabase } from '@/lib/supabase';
import type { CandleResponse, StockProfile } from '@/types/candles';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getToken(): Promise<string | undefined> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export async function fetchCandles(ticker: string, range: string): Promise<CandleResponse> {
  const token = await getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/tickers/${encodeURIComponent(ticker)}/candles?range=${range}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Failed to fetch candles for ${ticker}`);
  }

  return res.json();
}

export async function fetchProfile(ticker: string): Promise<StockProfile> {
  const token = await getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/tickers/${encodeURIComponent(ticker)}/profile`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Failed to fetch profile for ${ticker}`);
  }

  return res.json();
}
