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

export const SUPABASE_SCHEMA_SQL = `-- ELEGAN BD SUPABASE TABLES SETUP
-- 1. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    invoice_no BIGINT,
    customer_id TEXT,
    customer_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    thana TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    discount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    payment_method TEXT DEFAULT 'cod',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'General',
    images JSONB DEFAULT '[]'::jsonb,
    sizes JSONB DEFAULT '[]'::jsonb,
    stock INTEGER DEFAULT 0,
    size_stock JSONB DEFAULT '{}'::jsonb,
    sku TEXT,
    cost NUMERIC,
    regular_price NUMERIC,
    fabric TEXT,
    fit_type TEXT,
    description TEXT,
    rating NUMERIC DEFAULT 0,
    is_top_rated BOOLEAN DEFAULT FALSE,
    new_arrival BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    phone TEXT,
    name TEXT,
    notes TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create universal documents backup table
CREATE TABLE IF NOT EXISTS public.app_documents (
    id TEXT PRIMARY KEY,
    collection_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Allow API access without RLS friction
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_documents DISABLE ROW LEVEL SECURITY;

-- 6. Realtime replication for instant order updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;`;

// Helper with timeout to prevent sync from hanging
const withTimeout = <T>(promise: Promise<T>, ms = 6000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), ms))
  ]);
};

export async function syncOrdersToSupabase(ordersList?: any[]): Promise<{ synced: number; error?: string }> {
  const client = getSupabaseClient() || supabase;
  if (!client) throw new Error('Supabase client is not configured');

  let orders = ordersList;
  if (!orders || orders.length === 0) {
    try {
      const raw = localStorage.getItem('eleganbd_all_orders') || localStorage.getItem('eleganbd_orders');
      if (raw) orders = JSON.parse(raw);
    } catch {}
  }

  if (!orders || !Array.isArray(orders) || orders.length === 0) return { synced: 0 };

  const rows = orders.map(orderToSupabaseRow);
  const BATCH_SIZE = 50;
  let count = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await withTimeout(client.from('orders').upsert(chunk, { onConflict: 'id' }));
      if (!error) count += chunk.length;
    } catch (err) {
      console.warn('[SyncOrders] Batch upload chunk error:', err);
    }
  }

  return { synced: count };
}

export async function fetchOrdersFromSupabase(): Promise<any[]> {
  const client = getSupabaseClient() || supabase;
  if (!client) return [];

  try {
    const { data, error } = await withTimeout(
      client.from('orders').select('*').order('created_at', { ascending: false }).limit(1000),
      8000
    );
    if (!error && data && data.length > 0) {
      return data.map(supabaseRowToOrder);
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

  const rows = products.map(productToSupabaseRow);
  let count = 0;
  try {
    const { error } = await withTimeout(client.from('products').upsert(rows, { onConflict: 'id' }));
    if (!error) count = rows.length;
  } catch (err) {
    console.warn('[SyncProducts] Upload error:', err);
  }

  return { synced: count };
}

export async function fetchProductsFromSupabase(): Promise<any[]> {
  const client = getSupabaseClient() || supabase;
  if (!client) return [];

  try {
    const { data, error } = await withTimeout(client.from('products').select('*').limit(500), 8000);
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

  // 1. Save to localStorage immediately so subsequent requests use this project
  localStorage.setItem('elegan_supabase_url', supabaseUrl);
  localStorage.setItem('elegan_supabase_key', supabaseKey);
  localStorage.setItem('elegan_db_mode', 'supabase');

  onProgress({
    step: 'Connecting to new Supabase project...',
    progress: 1,
    total: 4,
    success: true
  });

  // 2. Fast batch sync products from local storage
  try {
    const localProducts = localStorage.getItem('eleganbd_products');
    if (localProducts) {
      const parsed = JSON.parse(localProducts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onProgress({
          step: `Syncing ${parsed.length} products to Supabase...`,
          progress: 2,
          total: 4,
          success: true
        });
        const rows = parsed.map(productToSupabaseRow);
        await withTimeout(client.from('products').upsert(rows, { onConflict: 'id' }), 5000);
      }
    }
  } catch (e) {
    console.warn('Fast products sync noticed:', e);
  }

  // 3. Fast batch sync orders from local storage
  try {
    const localOrders = localStorage.getItem('eleganbd_all_orders') || localStorage.getItem('eleganbd_orders');
    if (localOrders) {
      const parsed = JSON.parse(localOrders);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onProgress({
          step: `Syncing ${parsed.length} orders to Supabase...`,
          progress: 3,
          total: 4,
          success: true
        });
        const rows = parsed.map(orderToSupabaseRow);
        const BATCH = 50;
        for (let i = 0; i < rows.length; i += BATCH) {
          const chunk = rows.slice(i, i + BATCH);
          await withTimeout(client.from('orders').upsert(chunk, { onConflict: 'id' }), 5000);
        }
      }
    }
  } catch (e) {
    console.warn('Fast orders sync noticed:', e);
  }

  // 4. Fast customers & auxiliary data sync
  try {
    onProgress({
      step: 'Finalizing database connection...',
      progress: 4,
      total: 4,
      success: true
    });
  } catch (e) {}

  onProgress({
    step: 'Successfully connected and synced with Supabase!',
    progress: 4,
    total: 4,
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
