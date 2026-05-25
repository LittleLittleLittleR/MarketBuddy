import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
)

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  console.log("Error occured while logging out: ", error);
  return;
}
