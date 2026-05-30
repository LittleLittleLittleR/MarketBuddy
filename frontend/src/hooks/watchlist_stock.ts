import { stockService } from "@/db/stock"
import { watchlistStockService } from "@/db/watchlist_stock"
import type { StockResponse, WatchlistStockDisplay } from "@/types/stock"

const fetchWatchlist = async () => {
  const watchlistData = await watchlistStockService.getMyWatchlistStocks()

  const stockList: WatchlistStockDisplay[] = []

  for (const stock of watchlistData) {
    const stockData: StockResponse =
      await stockService.getStockByID(stock.stock_ticker)

    stockList.push({
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
    })
  }
  return stockList
}


const addStock = async (newTicker: string) => {
  try {
    if (!newTicker.trim()) {
      return
    }

    // check if stock exists
    const stock = await stockService.getStockByID(
      newTicker.toUpperCase()
    )

    await watchlistStockService.createWatchlistStock({
      stock_ticker: stock.ticker,
    })

  } catch (error) {
    console.error('Failed to add stock:', error)
  }
}


const deleteStock = async (ticker: string) => {
  try {
    const watchlistData = await watchlistStockService.getMyWatchlistStocks()

    const item = watchlistData.find(
      (s) => s.stock_ticker === ticker
    )

    if (!item) return

    await watchlistStockService.deleteWatchlistStock(item.id)

  } catch (error) {
    console.error('Failed to delete stock:', error)
  }
}

export const watchlistStockHooks = {
  fetchWatchlist,
  addStock,
  deleteStock,
}