import { fetchTickerPrices } from "@/api/ticker";
import { stockService } from "@/db/stock";
import { watchlistStockService } from "@/db/watchlist_stock";
import type { StocklistDisplay } from "@/types/stock";


// change response to StocklistDisplay[]
export const fetchMyWatchlistPrices = async () => {
  try {
    const tickers = (await watchlistStockService.getMyWatchlistStocks()).map(s => s.stock_ticker);

    if (!tickers.length) return;

    const data = await fetchTickerPrices(tickers);
    const stocklist = data.prices;

    const updatedStocks: StocklistDisplay[] = [];
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

    return updatedStocks;

  } catch (err) {
    console.error('Polling error:', err);
  }
};