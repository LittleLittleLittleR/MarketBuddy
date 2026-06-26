import { useQuery } from '@tanstack/react-query';
import { fetchCandles, fetchProfile } from '@/api/candles';
import { fetchEarnings } from '@/api/earnings';
import type { RangeOption } from '@/types/candles';

// staleTime is tuned per range — longer ranges change less frequently
const STALE_TIMES: Record<RangeOption, number> = {
  '1D': 30_000,     // 30s — intraday data shifts every minute
  '1W': 2 * 60_000, // 2m
  '1M': 5 * 60_000, // 5m
  '1Y': 60 * 60_000, // 1h 
};

export function useCandlesQuery(ticker: string, range: RangeOption) {
  return useQuery({
    queryKey: ['candles', ticker, range],
    queryFn: () => fetchCandles(ticker, range),
    staleTime: STALE_TIMES[range],
    enabled: !!ticker,
  });
}

export function useProfileQuery(ticker: string) {
  return useQuery({
    queryKey: ['stockProfile', ticker],
    queryFn: () => fetchProfile(ticker),
    staleTime: 60 * 60_000, // profile data is hourly cached on the backend
    enabled: !!ticker,
  });
}

export function useEarningsQuery(ticker: string) {
  return useQuery({
    queryKey: ['earnings', ticker],
    queryFn: () => fetchEarnings(ticker),
    staleTime: 60 * 60_000,
    enabled: !!ticker,
  });
}
