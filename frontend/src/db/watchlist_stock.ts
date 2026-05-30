import { supabase } from '@/lib/supabase';
import type {
  TablesInsert,
  TablesUpdate,
} from '@/types/supabase';
import { dbAuth } from './auth/auth';


const getMyWatchlistStocks = async () => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('watchlist_stocks')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
};

const getAllWatchlistStocks = async () => {
  const { data, error } = await supabase
    .from('watchlist_stocks')
    .select('stock_ticker', { count: 'exact' })
    .order('stock_ticker', { ascending: true });

  if (error) throw error;

  // dedupe duplicates
  const uniqueTickers = [...new Set(data.map((row) => row.stock_ticker))];

  return uniqueTickers;
};

const createWatchlistStock = async (
  watchlistStock: Omit<TablesInsert<'watchlist_stocks'>, 'user_id'>
) => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('watchlist_stocks')
    .insert({
      ...watchlistStock,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateWatchlistStock = async (
  watchlistStockId: number,
  updates: TablesUpdate<'watchlist_stocks'>
) => {
  await dbAuth.checkWatchlistStockAuth(watchlistStockId);

  const { data, error } = await supabase
    .from('watchlist_stocks')
    .update(updates)
    .eq('id', watchlistStockId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const deleteWatchlistStock = async (watchlistStockId: number) => {
  await dbAuth.checkWatchlistStockAuth(watchlistStockId);

  const { error } = await supabase
    .from('watchlist_stocks')
    .delete()
    .eq('id', watchlistStockId);

  if (error) {
    throw error;
  }
};

export const watchlistStockService = {
  getMyWatchlistStocks,
  createWatchlistStock,
  updateWatchlistStock,
  deleteWatchlistStock,
  getAllWatchlistStocks,
};