import { supabase } from '@/lib/supabase';
import type {
  TablesInsert,
  TablesUpdate,
} from '@/types/supabase';
import { dbAuth } from './auth/auth';


const getMyPriceAlerts = async () => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

const getActiveAlertsForTicker = async (ticker: string) => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('stock_ticker', ticker.toUpperCase())
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

const createPriceAlert = async (
  alert: Omit<TablesInsert<'price_alerts'>, 'user_id'>
) => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('price_alerts')
    .insert({
      ...alert,
      stock_ticker: alert.stock_ticker.toUpperCase(),
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updatePriceAlert = async (
  alertId: number,
  updates: TablesUpdate<'price_alerts'>
) => {
  await dbAuth.checkPriceAlertAuth(alertId);

  const { data, error } = await supabase
    .from('price_alerts')
    .update(updates)
    .eq('id', alertId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const deletePriceAlert = async (alertId: number) => {
  await dbAuth.checkPriceAlertAuth(alertId);

  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', alertId);

  if (error) {
    throw error;
  }
};

export const priceAlertService = {
  getMyPriceAlerts,
  getActiveAlertsForTicker,
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
};
