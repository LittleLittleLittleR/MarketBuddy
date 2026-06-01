import { useEffect } from 'react';
import type { WatchlistStockDisplay } from '@/types/stock';
import { fetchMyWatchlistPrices } from './price_fetching';


interface Props {
  setWatchlist: (watchlist: WatchlistStockDisplay[]) => void;
}

const LiveStockPriceUpdater = ({ setWatchlist }: Props) => {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const isMarketOpen = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const get = (type: string) => parts.find(p => p.type === type)?.value;
      const hour = Number(get('hour'));
      const minute = Number(get('minute'));
      const nyDate = new Date(
        now.toLocaleString('en-US', { timeZone: 'America/New_York' })
      );
      const day = nyDate.getDay();
      const isWeekday = day >= 1 && day <= 5;
      const currentMinutes = hour * 60 + minute;
      const marketOpen = 9 * 60 + 30;
      const marketClose = 16 * 60;
      return (
        isWeekday &&
        currentMinutes >= marketOpen &&
        currentMinutes < marketClose
      );
    };

    // interval polling
    intervalId = setInterval(async () => {
      if (!isMarketOpen()) return;
      const newData = await fetchMyWatchlistPrices();
      if (newData) {
        setWatchlist(newData);
      }
    }, 60 * 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}

export default LiveStockPriceUpdater;
export { fetchMyWatchlistPrices };
