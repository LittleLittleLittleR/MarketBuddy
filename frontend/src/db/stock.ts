import { supabase } from '@/lib/supabase';
import type { TablesUpdate } from '@/types/supabase';
import { dbAuth } from './auth/auth';

const getStocks = async () => {
  const { data, error } = await supabase
    .from('stocks')
    .select('*');

  if (error) {
    throw error;
  }

  return data;
}

const getStockByID = async (ticker: string) => {
  await dbAuth.checkStockAuth(ticker);

  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .eq('ticker', ticker)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

const getMyStocksByWatchlist = async () => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .in('ticker', await (async () => {
        const { data: watchlistData, error } = await supabase
          .from('watchlist_stocks')
          .select('stock_ticker')
          .eq('user_id', user.id);
        if (error) {
          throw error;
        }
        return watchlistData.map((item) => item.stock_ticker);
      })())
    .order('ticker', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

const getStocksByPortfolio = async (portfolioId: number) => {
  await dbAuth.checkPortfolioAuth(portfolioId);

  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .in('ticker', await (async () => {
        const { data: tradeData, error } = await supabase
          .from('trades')
          .select('ticker')
          .eq('portfolio_id', portfolioId);
        if (error) {
          throw error;
        }
        return (tradeData ?? [])
          .map((item: { ticker: string | null }) => item.ticker)
          .filter((ticker): ticker is string => Boolean(ticker));
      })())
    .order('ticker', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

const updateStock = async (
  ticker: string,
  updates: TablesUpdate<'stocks'>
) => {
  await dbAuth.checkStockAuth(ticker);

  const { data, error } = await supabase
    .from('stocks')
    .update(updates)
    .eq('ticker', ticker)
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  return data;
};

export const stockService = {
  getStocks,
  getMyStocksByWatchlist,
  getStocksByPortfolio,
  getStockByID,
  updateStock,
};