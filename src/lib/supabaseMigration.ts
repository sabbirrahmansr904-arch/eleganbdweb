import { getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';
import { getSupabaseClient, supabase, orderToSupabaseRow, productToSupabaseRow, supabaseRowToOrder, supabaseRowToProduct } from './supabase';

export interface MigrationProgress {
  step: string;
  progress: number;
  total: number;
  success: boolean;
  error?: string;
}

export async function syncOrdersToSupabase(ordersList?: any[]): Promise<{ synced: number; error?: string }> {
  const client = getSupabaseClient() || supabase;
  if (!client) {
    throw new Error('Supabase client is not configured');
  }

  let orders = ordersList;
  if (!orders || orders.length === 0) {
    try {
      const raw = localStorage.getItem('eleganbd_orders');
      if (raw) orders = JSON.parse(raw);
    } catch {}
  }

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return { synced: 0 };
  }

  let count = 0;
  for (const order of orders) {
    try {
      const row = orderToSupabaseRow(order);
      const { error } = await client.from('orders').upsert(row);
      if (!error) count++;

      // Also upsert into customers table
      const phone = order.phone || order.shippingAddress?.phone;
      if (phone) {
        try {
          await client.from('customers').upsert({
            id: phone.replace(/[^0-9]/g, '') || String(order.id),
            phone: phone,
            name: order.customerName || order.shippingAddress?.fullName || 'Customer',
            notes: order.notes || '',
            total_orders: 1,
            total_spent: Number(order.total) || 0,
            updated_at: new Date().toISOString()
          });
        } catch {}
      }

      // Universal backup in app_documents
      try {
        await client.from('app_documents').upsert({
          id: `orders_${order.id}`,
          collection_name: 'orders',
          record_id: String(order.id),
          data: order,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch {}
    } catch (e) {
      console.warn('Failed to upsert single order to Supabase:', e);
    }
  }

  return { synced: count };
}

export async function fetchOrdersFromSupabase(): Promise<any[]> {
  const client = getSupabaseClient() || supabase;
  if (!client) return [];

  try {
    const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(supabaseRowToOrder);
    }

    // Fallback check in app_documents
    const { data: backupData } = await client
      .from('app_documents')
      .select('data')
      .eq('collection_name', 'orders');
    
    if (backupData && backupData.length > 0) {
      return backupData.map(b => b.data);
    }
  } catch (err) {
    console.error('Error fetching orders from Supabase:', err);
  }
  return [];
}

export async function syncProductsToSupabase(productsList?: any[]): Promise<{ synced: number }> {
  const client = getSupabaseClient() || supabase;
  if (!client) return { synced: 0 };

  let products = productsList;
  if (!products || products.length === 0) {
    try {
      const raw = localStorage.getItem('eleganbd_products');
      if (raw) products = JSON.parse(raw);
    } catch {}
  }

  if (!products || !Array.isArray(products) || products.length === 0) return { synced: 0 };

  let count = 0;
  for (const p of products) {
    try {
      const row = productToSupabaseRow(p);
      const { error } = await client.from('products').upsert(row);
      if (!error) count++;

      try {
        await client.from('app_documents').upsert({
          id: `products_${p.id}`,
          collection_name: 'products',
          record_id: String(p.id),
          data: p,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch {}
    } catch {}
  }
  return { synced: count };
}

export async function fetchProductsFromSupabase(): Promise<any[]> {
  const client = getSupabaseClient() || supabase;
  if (!client) return [];

  try {
    const { data, error } = await client.from('products').select('*');
    if (!error && data && data.length > 0) {
      return data.map(supabaseRowToProduct);
    }
  } catch (err) {
    console.error('Error fetching products from Supabase:', err);
  }
  return [];
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

  // Also sync from localStorage items
  try {
    const localProducts = localStorage.getItem('eleganbd_products');
    if (localProducts) {
      const parsed = JSON.parse(localProducts);
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          try {
            const row = productToSupabaseRow(p);
            await client.from('products').upsert(row);
          } catch {}
        }
      }
    }

    const localOrders = localStorage.getItem('eleganbd_orders');
    if (localOrders) {
      const parsed = JSON.parse(localOrders);
      if (Array.isArray(parsed)) {
        for (const o of parsed) {
          try {
            const row = orderToSupabaseRow(o);
            await client.from('orders').upsert(row);
          } catch {}
        }
      }
    }
  } catch (e) {}
  
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
          // 1. Save to specific structured table if applicable
          if (colName === 'orders') {
            try {
              const row = orderToSupabaseRow({ ...item.data, id: item.id });
              await client.from('orders').upsert(row);
            } catch {}
          } else if (colName === 'products') {
            try {
              const row = productToSupabaseRow({ ...item.data, id: item.id });
              await client.from('products').upsert(row);
            } catch {}
          } else if (colName === 'customers') {
            try {
              await client.from('customers').upsert({
                id: item.id,
                phone: item.data.phone || item.id,
                name: item.data.name || 'Customer',
                notes: item.data.notes || '',
                total_orders: item.data.totalOrders || 0,
                total_spent: item.data.totalSpent || 0,
                updated_at: item.updated_at
              });
            } catch {}
          }

          // 2. Also write to app_documents table as universal backup
          try {
            await client
              .from('app_documents')
              .upsert({
                id: `${colName}_${item.id}`,
                collection_name: colName,
                record_id: item.id,
                data: item.data,
                updated_at: item.updated_at
              }, { onConflict: 'id' });
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn(`Skipped Firestore sync for ${colName} due to quota limit or offline error:`, err?.message);
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
  const current = localStorage.getItem('elegan_db_mode');
  if (!current) {
    localStorage.setItem('elegan_db_mode', 'supabase');
    return 'supabase';
  }
  return current as 'firebase' | 'supabase';
}
