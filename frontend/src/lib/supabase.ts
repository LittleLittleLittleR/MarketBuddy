import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
)

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.log("Error occured while logging out: ", error);
  }
}
