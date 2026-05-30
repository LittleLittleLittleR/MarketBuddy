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
  getStockByID,
  updateStock,
};