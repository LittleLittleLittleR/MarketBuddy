import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase environment variables missing: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

if (SUPABASE_URL && !/^https?:\/\//.test(SUPABASE_URL)) {
  console.error('VITE_SUPABASE_URL does not look like a valid URL:', SUPABASE_URL)
}

export const supabase = createClient<Database>(
  SUPABASE_URL ?? '',
  SUPABASE_KEY ?? ''
)

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.log("Error occured while logging out: ", error);
  }
}
