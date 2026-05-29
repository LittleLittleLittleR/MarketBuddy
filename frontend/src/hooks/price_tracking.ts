import { useEffect } from 'react';
import { fetchTickerPrices } from '@/api/ticker';
import { stockService } from '@/db/stock';
import { watchlistStockService } from '@/db/watchlist_stock';
import type { WatchlistStockDisplay } from '@/types/stock';

interface Props {
  setWatchlist: (watchlist: WatchlistStockDisplay[]) => void; 
}

const StockPriceUpdater = ({ setWatchlist }: Props) => {
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

        const tickers = (await watchlistStockService.getMyWatchlistStocks()).map(s => s.stock_ticker);

        if (!tickers.length) return;

        const data = await fetchTickerPrices(tickers);
        const stocklist = data.prices;

        const updatedStocks: WatchlistStockDisplay[] = [];
        for (const ticker of tickers) {
          const stock = stocklist[ticker];
          const db_stock = await stockService.getStockByID(ticker);

          updatedStocks.push({
            ticker: ticker,
            company_name: db_stock?.company_name || '',
            current_price: stock.price,
            change_percent: stock.opening_price !== 0
              ? ((stock.price - stock.opening_price) / stock.opening_price) * 100
              : null,
          });
        }

        if (updatedStocks.length) {
          setWatchlist(updatedStocks);
        }

      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // initial run
    poll();

    // interval polling
    intervalId = setInterval(poll, 60 * 100);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}

export default StockPriceUpdater;