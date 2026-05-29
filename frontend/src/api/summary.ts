import { supabase } from "@/lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Ticker Summaries API
export const fetchTickerSummaries = async (tickers: string[]) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const response = await fetch(`${API_BASE_URL}/api/analyse-stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${accessToken}` 
      },
      body: JSON.stringify({ tickers }),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch ticker summaries');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching ticker summaries:', error);
    throw error;
  }
};