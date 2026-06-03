import { portfolioService } from "@/db/portfolio"
import { stockService } from "@/db/stock";
import { tradeService } from "@/db/trade"
import type { PortfolioListDisplay, PortfoliolistStockDisplay } from "@/types/stock"

const findStockInPortfolio = async (portfolioId: number, ticker: string) => {
  const tradeStock = await tradeService.getTradesWithStockInfoByPortfolio(portfolioId, ticker);

  const totalQuantity = tradeStock.reduce((sum, stock) => 
    stock.side === 'buy' ? sum + stock.quantity : sum - stock.quantity, 0);

  const totalCost = tradeStock.reduce((sum, stock) => 
    stock.side === 'buy' ? sum+stock.quantity*stock.entry_cost+(stock.fees || 0) : sum-stock.quantity*stock.entry_cost-(stock.fees || 0), 0);

  const averagePrice = totalQuantity !== 0 ? totalCost / totalQuantity : 0;

  const stockInfo: PortfoliolistStockDisplay = {
    ticker: tradeStock[0].stocks.ticker,
    company_name: tradeStock[0].stocks.company_name,
    quantity: totalQuantity,
    average_price: averagePrice,
    profit_loss: (tradeStock[0].stocks.current_price || 0) - averagePrice,
    open_price: tradeStock[0].stocks.open_price,
    current_price: tradeStock[0].stocks.current_price,
  };

  return stockInfo;
};

const fetchStocks = async () => {
  const portfoliolist: PortfolioListDisplay[] = []
  const portfolios = await portfolioService.getMyPortfolios()

  for (const p of portfolios) {
    const stocks = await stockService.getStocksByPortfolio(p.id);
    const portfolioStocks = await Promise.all(stocks.map(stock => findStockInPortfolio(p.id, stock.ticker)))

    portfoliolist.push({
      name: p.name,
      stocks: portfolioStocks
    })
  }
  return portfoliolist
}

const addStock = async () => {
  // TODO: implement
}

const deleteStock = async () => {
  // TODO: implement
}

export const portfolioHooks = {
  fetchStocks,
  addStock,
  deleteStock,
}
