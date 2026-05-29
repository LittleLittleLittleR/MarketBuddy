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

export const stockService = {
  getStocks,
  getStockByID,
};