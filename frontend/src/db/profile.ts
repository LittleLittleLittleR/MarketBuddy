import { supabase } from '@/lib/supabase';
import type { TablesUpdate } from '@/types/supabase';
import { dbAuth } from './auth/auth';

const getMyProfile = async () => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

const updateMyProfile = async (updates: TablesUpdate<'profiles'>) => {
  const user = await dbAuth.checkUserAuth();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export const profileService = {
  getMyProfile,
  updateMyProfile,
}