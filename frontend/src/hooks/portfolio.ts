import { portfolioService } from "@/db/portfolio"
import { stockService } from "@/db/stock";
import { tradeService } from "@/db/trade"
import { fetchTickerPrices } from "@/api/ticker"
import type { PortfolioListDisplay, PortfoliolistStockDisplay } from "@/types/stock"

const fetchStocks = async () => {
  const portfolios = await portfolioService.getMyPortfolios()

  const portfolioTrades = await Promise.all(
    portfolios.map(async (p) => ({
      p,
      trades: await tradeService.getTradesByPortfolio(p.id),
    }))
  )

  const allTickers = [...new Set(
    portfolioTrades.flatMap(({ trades }) =>
      trades
        .map((trade) => trade.ticker)
        .filter((ticker): ticker is string => Boolean(ticker))
        .map((ticker) => ticker.toUpperCase())
    )
  )]
  const prices = allTickers.length ? await fetchTickerPrices(allTickers) : {}

  const portfoliolist: PortfolioListDisplay[] = []

  for (const { p, trades } of portfolioTrades) {
    const tickers = [...new Set(
      trades
        .map((trade) => trade.ticker)
        .filter((ticker): ticker is string => Boolean(ticker))
    )]

    const portfolioStocks: PortfoliolistStockDisplay[] = (await Promise.all(
      tickers.map(async (ticker) => {
        const stockInfo = await stockService.getStockByID(ticker)
        const tickerTrades = trades.filter((trade) => trade.ticker === ticker)

        let totalquantity = 0
        let averageSum = 0

        for (const trade of tickerTrades) {
          if (trade.side === 'buy') {
            averageSum += trade.quantity * trade.entry_cost
            totalquantity += trade.quantity
          } else if (trade.side === 'sell') {
            const averagePriceBeforeSell = totalquantity > 0 ? averageSum / totalquantity : 0
            totalquantity = totalquantity - trade.quantity
            averageSum = averagePriceBeforeSell * totalquantity
          }
        }

        const averagePrice = totalquantity > 0 ? averageSum / totalquantity : 0

        const live = prices[ticker.toUpperCase()]
        const current_price = live?.price ?? null
        const open_price = live?.open ?? null

        return {
          ticker: stockInfo.ticker,
          company_name: stockInfo.company_name,
          quantity: totalquantity,
          average_price: averagePrice,
          profit_loss: (current_price ?? 0) - averagePrice,
          open_price,
          current_price,
        }
      })
    )).filter((stock) => stock.quantity > 0)

    portfoliolist.push({
      id: p.id,
      name: p.name,
      stocks: portfolioStocks
    })
  }
  return portfoliolist
}

const getPortfolios: () => Promise<[string, string][]> = async () => {
  const portfolios = await portfolioService.getMyPortfolios();
  return portfolios.map(p => [p.name, p.created_at]);
}

const addPortfolio = async (name: string) => {
  try {
      if (!name?.trim()) {
        return
      }
      await portfolioService.createPortfolio({name});
  
    } catch (error) {
      console.error('Failed to add new portfolio:', error)
    }
}

const deletePortfolio = async (name: string) => {
  try {
    if (!name?.trim()) {
      return
    }
    await portfolioService.deleteMyPortfolioByName(name);

  } catch (error) {
    console.error('Failed to delete portfolio:', error)
  }
}

export const portfolioHooks = {
  fetchStocks,
  getPortfolios,
  addPortfolio,
  deletePortfolio,
}
