import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The backend is optional. With no project configured the game runs offline
// and everything in src/backend quietly does nothing.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, {
      // PKCE returns from the sign-in email with ?code=…, which leaves the URL hash free for the game's router.
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const backendConfigured = supabase !== null;
