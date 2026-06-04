import { stockService } from "@/db/stock"
import { watchlistStockService } from "@/db/watchlist_stock"
import type { StockResponse, StocklistResponse, WatchlistStockDisplay } from "@/types/stock"

const fetchStocks= async () => {
  let watchlistData: StocklistResponse[] = []

  watchlistData = await watchlistStockService.getMyWatchlistStocks()

  const watchlist: WatchlistStockDisplay[] = []

  for (const stock of watchlistData) {
    const stockData: StockResponse =
      await stockService.getStockByID(stock.stock_ticker)

    watchlist.push({
      ticker: stockData.ticker,
      company_name: stockData.company_name,
      current_price: stockData.current_price,
      change_percent:
        stockData.current_price !== null &&
          stockData.open_price !== null &&
          stockData.open_price !== 0
          ? ((stockData.current_price - stockData.open_price) /
            stockData.open_price) *
          100
          : null,
      open_price: stockData.open_price,
    })
  }
  return watchlist;
}

const addStock = async (newTicker: string) => {
  console.log("Received stock to add: ", newTicker)
  try {
    if (!newTicker?.trim()) {
      return
    }

    // check if stock exists
    const stock = await stockService.getStockByID(
      newTicker.toUpperCase()
    )
    await watchlistStockService.createWatchlistStock({ stock_ticker: stock.ticker })

  } catch (error) {
    console.error('Failed to add stock:', error)
  }
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
