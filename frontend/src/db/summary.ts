import { supabase } from '@/lib/supabase';
import type { TablesUpdate } from '@/types/supabase';

const getSummaryByTicker = async (ticker: string) => {
  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('ticker', ticker)
    .order('summary_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateSummary = async (ticker: string, updates: TablesUpdate<'summaries'>) => {
  const { data, error } = await supabase
    .from('summaries')
    .update(updates)
    .eq('ticker', ticker)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const summaryService = {
  getSummaryByTicker,
  updateSummary,
};