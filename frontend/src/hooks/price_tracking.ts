import { useEffect } from 'react';
import { fetchTickerPrices } from '@/api/ticker';
import { stockService } from '@/db/stock';
import { watchlistStockService } from '@/db/watchlist_stock';
import type { WatchlistStockDisplay } from '@/types/stock';

interface Props {
  watchlist: WatchlistStockDisplay[];
  setWatchlist: (watchlist: WatchlistStockDisplay[]) => void; 
}

const StockPriceUpdater = ({ watchlist, setWatchlist }: Props) => {
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
        const stocklist = data.prices;

        const updatedStocks: WatchlistStockDisplay[] = [];
        for (const ticker of tickers) {
          const stock = stocklist[ticker];
          console.log(`Updating ${ticker}: `, stock);
          
          // await stockService.updateStock(ticker, {
          //   current_price: stock.price,
          //   open_price: stock.opening_price,
          //   updated_at: stock.updated_at,
          //   ticker: ticker,
          // });

          updatedStocks.push({
            ticker: ticker,
            company_name: '',
            current_price: stock.price,
            change_percent: ((stock.current_price - stock.open_price) / stock.open_price) * 100,
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
    intervalId = setInterval(poll, 60 * 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}

export default StockPriceUpdater;