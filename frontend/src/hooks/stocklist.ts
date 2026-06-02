import { stockService } from "@/db/stock"
import { watchlistStockService } from "@/db/watchlist_stock"
import { summarylistStockService } from "@/db/summarylist_stock"
import type { StockResponse, StocklistResponse, StocklistDisplay } from "@/types/stock"

type StocklistHooksProps = {
  stockType: 'watchlist' | 'portfolio' | 'summarylist';
  newTicker?: string;
};

const fetchStocklist = async (props: StocklistHooksProps) => {
  let stocklistData: StocklistResponse[] = []

  if (props.stockType === 'watchlist') {
    stocklistData = await watchlistStockService.getMyWatchlistStocks()
  } else if (props.stockType === 'summarylist') {
    stocklistData = await summarylistStockService.getMySummarylistStocks()
  }

  const stockList: StocklistDisplay[] = []

  for (const stock of stocklistData) {
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


const addStock = async (props: StocklistHooksProps) => {
  console.log("Received stock to add: ", props.newTicker)
  try {
    if (!props.newTicker?.trim()) {
      return
    }

    // check if stock exists
    const stock = await stockService.getStockByID(
      props.newTicker.toUpperCase()
    )
    if (props.stockType === 'summarylist') {
      await summarylistStockService.createSummarylistStock({
        stock_ticker: stock.ticker,
      })
    } else if (props.stockType === 'watchlist') {
      await watchlistStockService.createWatchlistStock({
        stock_ticker: stock.ticker,
      })
    }

  } catch (error) {
    console.error('Failed to add stock:', error)
  }
}


const deleteStock = async (props: StocklistHooksProps) => {
  try {
    let stocklistData: StocklistResponse[] = []
    if (props.stockType === 'watchlist') {
      stocklistData = await watchlistStockService.getMyWatchlistStocks()
    } else if (props.stockType === 'summarylist') {
      stocklistData = await summarylistStockService.getMySummarylistStocks()
    }

    const item = stocklistData.find(
      (s) => s.stock_ticker === props.newTicker
    )

    if (!item) return

    if (props.stockType === 'watchlist') {
      await watchlistStockService.deleteWatchlistStock(item.id)
    } else if (props.stockType === 'summarylist') {
      await summarylistStockService.deleteSummarylistStock(item.id)
    }

  } catch (error) {
    console.error('Failed to delete stock:', error)
  }
}

export const stocklistHooks = {
  fetchStocklist,
  addStock,
  deleteStock,
}
