import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment, localStorage, or fallback to user provided credentials
const DEFAULT_SUPABASE_URL = 'https://wnnnjroxyuxsbolbcdil.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';

const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('elegan_supabase_url') || DEFAULT_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('elegan_supabase_key') || DEFAULT_SUPABASE_KEY;
  return { url, anonKey };
};

const { url, anonKey } = getSupabaseConfig();

// Ensure localStorage has them set for fallback/persistence
if (typeof window !== 'undefined') {
  if (!localStorage.getItem('elegan_supabase_url')) {
    localStorage.setItem('elegan_supabase_url', DEFAULT_SUPABASE_URL);
  }
  if (!localStorage.getItem('elegan_supabase_key')) {
    localStorage.setItem('elegan_supabase_key', DEFAULT_SUPABASE_KEY);
  }
  localStorage.setItem('elegan_db_mode', 'supabase');
}

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || DEFAULT_SUPABASE_URL, anonKey || DEFAULT_SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const getSupabaseClient = (customUrl?: string, customKey?: string) => {
  const u = customUrl || localStorage.getItem('elegan_supabase_url') || DEFAULT_SUPABASE_URL;
  const k = customKey || localStorage.getItem('elegan_supabase_key') || DEFAULT_SUPABASE_KEY;
  return createClient(u, k);
};
