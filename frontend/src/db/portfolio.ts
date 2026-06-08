import { supabase } from '@/lib/supabase';
import type {
  TablesInsert,
  TablesUpdate,
} from '@/types/supabase';
import { dbAuth } from './auth/auth';


const getMyPortfolios = async () => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
};


const createPortfolio = async (
  portfolio: Omit<TablesInsert<'portfolios'>, 'user_id'>
) => {
  const user = await dbAuth.checkUserAuth();
  
  // users should not have portfolios with the same name
  const porfolios = await getMyPortfolios();
  for (const p of porfolios) {
    if (p.name === portfolio.name) {
      throw new Error('Portfolio with the same name already exists');
    }
  }

  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      ...portfolio,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};


const updatePortfolio = async (
  portfolioId: number,
  updates: TablesUpdate<'portfolios'>
) => {
  await dbAuth.checkPortfolioAuth(portfolioId);
  
  const { data, error } = await supabase
    .from('portfolios')
    .update(updates)
    .eq('id', portfolioId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};


const deletePortfolio = async (portfolioId: number) => {
  await dbAuth.checkPortfolioAuth(portfolioId);

  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', portfolioId);

  if (error) {
    throw error;
  }
};

const deleteMyPortfolioByName = async (name: string) => {
  const portfolios = await getMyPortfolios();

  for (const p of portfolios) {
    if (p.name === name) {
      await deletePortfolio(p.id);
      return;
    }
  }
};
  


export const portfolioService = {
  getMyPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  deleteMyPortfolioByName,
};