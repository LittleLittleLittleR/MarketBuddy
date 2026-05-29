import { useEffect } from 'react';
import { fetchTickerPrices } from '@/api/ticker';
import { stockService } from '@/db/stock';
import { watchlistStockService } from '@/db/watchlist_stock';

export default function StockPriceUpdater() {
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

    const poll = async () => {
      try {
        if (!isMarketOpen()) return;

        const tickers = await watchlistStockService.getAllWatchlistStocks();

        if (!tickers.length) return;

        const data = await fetchTickerPrices(tickers);

        for (const [ticker, values] of Object.entries(data) as Array<[
          string,
          { price: number; open_price: number }
        ]>) {
          await stockService.updateStock(ticker, {
            current_price: values.price,
            open_price: values.open_price,
            ticker,
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // initial run
    poll();

    // interval polling
    intervalId = setInterval(poll, 60 * 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}