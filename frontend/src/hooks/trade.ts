import { portfolioService } from "@/db/portfolio"
import { tradeService } from "@/db/trade"
import type { PortfolioTradeDisplay, TradeRequest } from "@/types/trade"


const fetchTradesByPortfolio = async () => {
  const portfoliotradelist: PortfolioTradeDisplay[] = []
  const portfolios = await portfolioService.getMyPortfolios()

  for (const p of portfolios) {
    const trades = await tradeService.getTradesByPortfolio(p.id);

    portfoliotradelist.push({
      name: p.name,
      trades: trades
    })
  }
  return portfoliotradelist
}

const addTrade = async (payload: TradeRequest) => {
  try {
      if (!payload.portfolio_id || !payload.ticker.trim() || !payload.quantity || !payload.entry_cost || !payload.side) {
        return
      }
      await tradeService.createTrade({
        portfolio_id: payload.portfolio_id,
        ticker: payload.ticker,
        quantity: payload.quantity,
        entry_cost: payload.entry_cost,
        fees: payload.fees,
        notes: payload.notes,
        trade_date: payload.trade_date,
        side: payload.side
      });
  
    } catch (error) {
      console.error('Failed to add new trade:', error)
    }
}

const deleteTrade = async (tradeId: number) => {
  try {
    if (!tradeId) {
      return
    }
    await tradeService.deleteTrade(tradeId);

  } catch (error) {
    console.error('Failed to delete trade:', error)
  }
}

export const tradeHooks = {
  fetchTradesByPortfolio,
  addTrade,
  deleteTrade,
}
