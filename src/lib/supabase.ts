import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment or localStorage
const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('elegan_supabase_url') || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('elegan_supabase_key') || '';
  return { url, anonKey };
};

const { url, anonKey } = getSupabaseConfig();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

export const getSupabaseClient = (customUrl?: string, customKey?: string) => {
  const u = customUrl || localStorage.getItem('elegan_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
  const k = customKey || localStorage.getItem('elegan_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!u || !k) return null;
  return createClient(u, k);
};
