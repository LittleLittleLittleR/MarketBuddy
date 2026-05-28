import { supabase } from '@/lib/supabase';

const UserIDAuth = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  return user;
};


const StockIDAuth = async (stockId: string) => {
  const { data: stock, error } = await supabase
    .from('stocks')
    .select('id')
    .eq('ticker', stockId)
    .single();
  
  if (error || !stock) {
    throw new Error('Stock not found');
  }

  return stock;
};


// check if current user is the owner of the portfolio
const PortfolioIDAuth = async (portfolioId: number) => {
  const user = await UserIDAuth();
  const { data: portfolio, error } = await supabase
    .from('portfolios')
    .select('user_id')
    .eq('id', portfolioId)
    .single();
  
  if (error || !portfolio) {
    throw new Error('Portfolio not found');
  }
  if (portfolio.user_id !== user.id) {
    throw new Error('Unauthorized');
  }

  return portfolio;
};


const WatchlistStockIDAuth = async (watchlistStockId: number) => {
  const user = await UserIDAuth();
  const { data: watchlistStock, error } = await supabase
    .from('watchlist_stocks')
    .select('user_id, stock_ticker')
    .eq('id', watchlistStockId)
    .single();
  
  if (error || !watchlistStock) {
    throw new Error('Watchlist stock not found');
  }
  if (watchlistStock.user_id !== user.id) {
    throw new Error('Unauthorized');
  }
  if (watchlistStock.stock_ticker) {
    await StockIDAuth(watchlistStock.stock_ticker);
  }
  return watchlistStock;
};


const TradeIDAuth = async (tradeId: number) => {
  const { data: trade, error } = await supabase
    .from('trades')
    .select('portfolio_id, ticker')
    .eq('id', tradeId)
    .single();
  
  if (error || !trade) {
    throw new Error('Trade not found');
  }

  await PortfolioIDAuth(trade.portfolio_id);
  await StockIDAuth(trade.ticker);

  return trade;
};


export const dbAuth = {
  checkUserAuth: UserIDAuth,
  checkPortfolioAuth: PortfolioIDAuth,
  checkTradeAuth: TradeIDAuth,
  checkWatchlistStockAuth: WatchlistStockIDAuth,
}