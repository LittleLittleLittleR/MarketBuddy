import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase environment variables missing: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

if (SUPABASE_URL && !/^https?:\/\//.test(SUPABASE_URL)) {
  console.error('VITE_SUPABASE_URL does not look like a valid URL:', SUPABASE_URL)
}

export const supabase = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_KEY ?? ''
)

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error occurred while logging out: ', error.message ?? error);
  } catch (err) {
    console.error('Unexpected error during signOut:', err);
  }
}
