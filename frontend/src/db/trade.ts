import { supabase } from '@/lib/supabase';
import type {
  TablesInsert,
  TablesUpdate,
} from '@/types/supabase';
import { dbAuth } from './auth/auth';

const getTradesByPortfolio = async (portfolioId: number) => {
  await dbAuth.checkPortfolioAuth(portfolioId);

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('trade_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

const getTradesWithStockInfoByPortfolio = async (portfolioId: number, ticker: string) => {
  await dbAuth.checkPortfolioAuth(portfolioId);

  const { data, error } = await supabase.from('trades')
    .select(`
      *,
      stocks (
        ticker,
        company_name,
        current_price,
        open_price
      )
    `)
    .eq('portfolio_id', portfolioId)
    .eq('stocks.ticker', ticker)
    .order('trade_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

const getTradeById = async (tradeId: number) => {
  await dbAuth.checkTradeAuth(tradeId);

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('id', tradeId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};


const createTrade = async (
  trade: TablesInsert<'trades'>
) => {
  await dbAuth.checkPortfolioAuth(trade.portfolio_id);

  const { data, error } = await supabase
    .from('trades')
    .insert(trade)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};


const updateTrade = async (
  tradeId: number,
  updates: TablesUpdate<'trades'>
) => {
  await dbAuth.checkTradeAuth(tradeId);

  const { data, error } = await supabase
    .from('trades')
    .update(updates)
    .eq('id', tradeId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const deleteTrade = async (tradeId: number) => {
  await dbAuth.checkTradeAuth(tradeId);

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', tradeId);

  if (error) {
    throw error;
  }
};

export const tradeService = {
  getTradesByPortfolio,
  getTradeById,
  createTrade,
  updateTrade,
  deleteTrade,
  getTradesWithStockInfoByPortfolio,
};