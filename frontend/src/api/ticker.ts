import { supabase } from "@/lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type LiveTickerPrice = {
  price: number | null;
  open?: number | null;
  opening_price?: number | null;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'INVALID';
  updated_at: number | null;
};

export const fetchTickerPrices = async (
  tickers: string[]
): Promise<Record<string, LiveTickerPrice>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  const response = await fetch(`${API_BASE_URL}/api/tickers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({ tickers }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch ticker prices');
  }
  const data = await response.json();
  return data.prices ?? {};
};
