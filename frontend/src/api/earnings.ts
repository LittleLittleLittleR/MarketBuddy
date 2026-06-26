import { supabase } from '@/lib/supabase';
import type { Earnings } from '@/types/candles';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getToken(): Promise<string | undefined> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export async function fetchEarnings(ticker: string): Promise<Earnings | null> {
  const token = await getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/earnings/${encodeURIComponent(ticker)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch earnings for ${ticker}`);
  }

  const json = await res.json();
  return json.data ?? null;
}
