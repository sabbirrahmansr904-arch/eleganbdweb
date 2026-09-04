import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export async function getSupabaseCollectionData(collectionName: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('app_documents')
      .select('*')
      .eq('collection_name', collectionName);
    
    if (error) {
      console.warn(`Supabase fetch error for ${collectionName}:`, error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.record_id || row.id.replace(`${collectionName}_`, ''),
      ...(row.data || {})
    }));
  } catch (err) {
    console.warn(`Supabase collection query failed for ${collectionName}:`, err);
    return [];
  }
}

export async function getSupabaseDocData(collectionName: string, docId: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const rowId = `${collectionName}_${docId}`;
    const { data, error } = await client
      .from('app_documents')
      .select('*')
      .eq('id', rowId)
      .single();
    
    if (error || !data) return null;
    return {
      id: data.record_id || docId,
      ...(data.data || {})
    };
  } catch {
    return null;
  }
}

export async function setSupabaseDocData(collectionName: string, docId: string, docData: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const rowId = `${collectionName}_${docId}`;
    const { error } = await client
      .from('app_documents')
      .upsert({
        id: rowId,
        collection_name: collectionName,
        record_id: docId,
        data: docData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.warn(`Supabase setDoc error for ${collectionName}/${docId}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Supabase setDoc failed for ${collectionName}/${docId}:`, err);
    return false;
  }
}

export async function deleteSupabaseDocData(collectionName: string, docId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const rowId = `${collectionName}_${docId}`;
    const { error } = await client
      .from('app_documents')
      .delete()
      .eq('id', rowId);
    
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}
