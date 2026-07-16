import { stockService } from "@/db/stock"
import { watchlistStockService } from "@/db/watchlist_stock"
import { fetchTickerPrices } from "@/api/ticker"
import type { StockResponse, StocklistResponse, WatchlistStockDisplay } from "@/types/stock"

const fetchStocks= async () => {
  const watchlistData: StocklistResponse[] = await watchlistStockService.getMyWatchlistStocks()

  const tickers = [...new Set(watchlistData.map((s) => s.stock_ticker.toUpperCase()))]
  const prices = tickers.length ? await fetchTickerPrices(tickers) : {}

  const watchlist: WatchlistStockDisplay[] = []

  for (const stock of watchlistData) {
    const stockData: StockResponse =
      await stockService.getStockByID(stock.stock_ticker)

    const live = prices[stockData.ticker.toUpperCase()]
    const current_price = live?.price ?? null
    const open_price = live?.open ?? null

    watchlist.push({
      ticker: stockData.ticker,
      company_name: stockData.company_name,
      current_price,
      change_percent:
        current_price !== null &&
          open_price !== null &&
          open_price !== 0
          ? ((current_price - open_price) / open_price) * 100
          : null,
      open_price,
    })
  }
  return watchlist;
}

const addStock = async (newTicker: string) => {
  if (!newTicker?.trim()) {
    return
  }

  const stock = await stockService.getStockByID(
    newTicker.toUpperCase()
  )
  await watchlistStockService.createWatchlistStock({ stock_ticker: stock.ticker })
}


const deleteStock = async (newTicker: string) => {
  try {
    const watchlistData: StocklistResponse[] = await watchlistStockService.getMyWatchlistStocks()

    const item = watchlistData.find(
      (s) => s.stock_ticker === newTicker
    )

    if (!item) return

    await watchlistStockService.deleteWatchlistStock(item.id)

  } catch (error) {
    console.error('Failed to delete stock:', error)
  }
}

export const watchlistHooks = {
  fetchStocks,
  addStock,
  deleteStock,
}
