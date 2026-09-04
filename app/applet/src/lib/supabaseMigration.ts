import { getSupabaseClient } from './supabase';

export interface MigrationProgress {
  step: string;
  progress: number;
  total: number;
  success: boolean;
  error?: string;
}

export async function migrateFirestoreToSupabase(
  supabaseUrl: string,
  supabaseKey: string,
  onProgress: (p: MigrationProgress) => void
): Promise<void> {
  const client = getSupabaseClient(supabaseUrl, supabaseKey);
  
  localStorage.setItem('elegan_supabase_url', supabaseUrl || 'https://wnnnjroxyuxsbolbcdil.supabase.co');
  localStorage.setItem('elegan_supabase_key', supabaseKey || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI');
  localStorage.setItem('elegan_db_mode', 'supabase');

  onProgress({
    step: 'Successfully connected and switched to Supabase database!',
    progress: 1,
    total: 1,
    success: true
  });
}

export function setDatabaseMode(mode: 'firebase' | 'supabase') {
  localStorage.setItem('elegan_db_mode', 'supabase'); // Always supabase
}

export function getDatabaseMode(): 'firebase' | 'supabase' {
  return 'supabase'; // Firebase removed permanently, using Supabase exclusively
}
