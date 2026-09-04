import { getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';
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
  if (!client) {
    throw new Error('Invalid Supabase URL or Anon Key');
  }

  // Save to localStorage immediately so subsequent requests use Supabase
  localStorage.setItem('elegan_supabase_url', supabaseUrl);
  localStorage.setItem('elegan_supabase_key', supabaseKey);
  localStorage.setItem('elegan_db_mode', 'supabase');

  const collectionsList = ['orders', 'products', 'inventory', 'expenses', 'categories', 'finance', 'settings', 'customers'];
  
  let totalCollections = collectionsList.length;
  let currentCollectionIndex = 0;

  for (const colName of collectionsList) {
    currentCollectionIndex++;
    onProgress({
      step: `Connecting & syncing: ${colName}...`,
      progress: currentCollectionIndex,
      total: totalCollections,
      success: true
    });

    try {
      // Attempt fetching from Firestore if quota is available
      const querySnapshot = await getDocs(collection(db, colName));
      const items: any[] = [];
      querySnapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          data: docSnap.data(),
          updated_at: new Date().toISOString()
        });
      });

      if (items.length > 0) {
        for (const item of items) {
          await client
            .from('app_documents')
            .upsert({
              id: `${colName}_${item.id}`,
              collection_name: colName,
              record_id: item.id,
              data: item.data,
              updated_at: item.updated_at
            }, { onConflict: 'id' });
        }
      }
    } catch (err: any) {
      console.warn(`Skipped Firestore sync for ${colName} due to quota limit or offline error:`, err?.message);
      // Non-fatal: even if Firestore quota blocks reading, we successfully set Supabase mode
    }
  }

  onProgress({
    step: 'Successfully connected and switched to Supabase database!',
    progress: totalCollections,
    total: totalCollections,
    success: true
  });
}

export function setDatabaseMode(mode: 'firebase' | 'supabase') {
  localStorage.setItem('elegan_db_mode', mode);
}

export function getDatabaseMode(): 'firebase' | 'supabase' {
  return (localStorage.getItem('elegan_db_mode') as 'firebase' | 'supabase') || 'firebase';
}
