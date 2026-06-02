import { supabase } from '@/lib/supabase';
import type {
  TablesInsert,
  TablesUpdate,
} from '@/types/supabase';
import { dbAuth } from './auth/auth';


const getMySummarylistStocks = async () => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('summarylist_stocks')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
};

const getAllSummarylistStocks = async () => {
  const { data, error } = await supabase
    .from('summarylist_stocks')
    .select('stock_ticker', { count: 'exact' })
    .order('stock_ticker', { ascending: true });

  if (error) throw error;

  // dedupe duplicates
  const uniqueTickers = [...new Set(data.map((row) => row.stock_ticker))];

  return uniqueTickers;
};

const createSummarylistStock = async (
  summarylistStock: Omit<TablesInsert<'summarylist_stocks'>, 'user_id'>
) => {
  const user = await dbAuth.checkUserAuth();
  const current_data = await getMySummarylistStocks();

  if (current_data.length >= 3) {
    throw new Error('You can only have up to 3 stocks in your summary list.');
  }

  const { data, error } = await supabase
    .from('summarylist_stocks')
    .insert({
      ...summarylistStock,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateSummarylistStock = async (
  summarylistStockId: number,
  updates: TablesUpdate<'summarylist_stocks'>
) => {
  await dbAuth.checkSummarylistStockAuth(summarylistStockId);

  const { data, error } = await supabase
    .from('summarylist_stocks')
    .update(updates)
    .eq('id', summarylistStockId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const deleteSummarylistStock = async (summarylistStockId: number) => {
  await dbAuth.checkSummarylistStockAuth(summarylistStockId);

  const { error } = await supabase
    .from('summarylist_stocks')
    .delete()
    .eq('id', summarylistStockId);

  if (error) {
    throw error;
  }
};

export const summarylistStockService = {
  getMySummarylistStocks,
  createSummarylistStock,
  updateSummarylistStock,
  deleteSummarylistStock,
  getAllSummarylistStocks,
};