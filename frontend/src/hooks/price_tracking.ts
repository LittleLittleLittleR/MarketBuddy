import type { AuthResponse } from '../types/Auth/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';


// Ticker Prices API
export const fetchTickerPrices = async (tickers: string[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tickers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tickers }),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch ticker prices');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching ticker prices:', error);
    throw error;
  }
};