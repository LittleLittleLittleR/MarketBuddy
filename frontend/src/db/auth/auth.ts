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
    .select('user_id')
    .eq('id', watchlistStockId)
    .single();
  
  if (error || !watchlistStock) {
    throw new Error('Watchlist stock not found');
  }
  if (watchlistStock.user_id !== user.id) {
    throw new Error('Unauthorized');
  }

  return watchlistStock;
};


const TradeIDAuth = async (tradeId: number) => {
  const { data: trade, error } = await supabase
    .from('trades')
    .select('portfolio_id')
    .eq('id', tradeId)
    .single();
  
  if (error || !trade) {
    throw new Error('Trade not found');
  }

  await PortfolioIDAuth(trade.portfolio_id);

  return trade;
};


export const dbAuth = {
  checkUserAuth: UserIDAuth,
  checkPortfolioAuth: PortfolioIDAuth,
  checkTradeAuth: TradeIDAuth,
  checkWatchlistStockAuth: WatchlistStockIDAuth,
}