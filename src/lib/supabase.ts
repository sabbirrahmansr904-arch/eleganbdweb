import { createClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided by user
const DEFAULT_SUPABASE_URL = 'https://wnnnjroxyuxsbolbcdil.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';

// Get Supabase credentials from environment or localStorage or fallback
export const getSupabaseConfig = () => {
  const url = 
    import.meta.env.VITE_SUPABASE_URL || 
    localStorage.getItem('elegan_supabase_url') || 
    DEFAULT_SUPABASE_URL;
  const anonKey = 
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    localStorage.getItem('elegan_supabase_key') || 
    DEFAULT_SUPABASE_ANON_KEY;
  return { url, anonKey };
};

const { url, anonKey } = getSupabaseConfig();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const getSupabaseClient = (customUrl?: string, customKey?: string) => {
  const u = customUrl || localStorage.getItem('elegan_supabase_url') || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const k = customKey || localStorage.getItem('elegan_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (!u || !k) return null;
  return createClient(u, k);
};

// ==========================================
// SUPABASE DATA LAYER UTILITIES & HELPERS
// ==========================================

export interface SupabaseOrderRow {
  id: string;
  invoice_no?: number | null;
  customer_id?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  thana?: string | null;
  items: any;
  discount?: number | null;
  total: number;
  status: string;
  payment_method?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function orderToSupabaseRow(order: any): SupabaseOrderRow {
  const customerIdVal = order.customerId || (order.phone ? `CUST-${order.phone.replace(/[^0-9]/g, '')}` : `CUST-${Math.floor(Math.random() * 100000)}`);
  
  // Package any auxiliary fields into notes metadata so Supabase stores 100% of order details
  const meta: Record<string, any> = {};
  if (order.deliveryCharge !== undefined) meta.deliveryCharge = order.deliveryCharge;
  if (order.shippingCost !== undefined) meta.shippingCost = order.shippingCost;
  if (order.subtotal !== undefined) meta.subtotal = order.subtotal;
  if (order.paymentStatus) meta.paymentStatus = order.paymentStatus;
  if (order.courier) meta.courier = order.courier;
  if (order.trackingId) meta.trackingId = order.trackingId;
  if (order.courierStatus) meta.courierStatus = order.courierStatus;
  if (order.invoiceBy) meta.invoiceBy = order.invoiceBy;
  if (order.userNote) meta.userNote = order.userNote;

  let cleanNotes = order.notes || '';
  if (cleanNotes.includes('__META__:') && cleanNotes.includes('__ENDMETA__')) {
    cleanNotes = cleanNotes.replace(/__META__:.*?__ENDMETA__\s*/, '').trim();
  }

  let notesVal = cleanNotes;
  if (Object.keys(meta).length > 0) {
    notesVal = `__META__:${JSON.stringify(meta)}__ENDMETA__ ${cleanNotes}`.trim();
  }

  return {
    id: String(order.id),
    invoice_no: typeof order.invoiceNo === 'number' ? order.invoiceNo : (parseInt(String(order.id).replace(/[^0-9]/g, ''), 10) || null),
    customer_id: customerIdVal,
    customer_name: order.customerName || (order.shippingAddress?.fullName) || 'Valued Customer',
    phone: order.phone || (order.shippingAddress?.phone) || '',
    email: order.email || null,
    address: order.address || (order.shippingAddress?.address) || '',
    city: order.city || (order.shippingAddress?.city) || 'Dhaka',
    thana: order.thana || (order.shippingAddress?.thana) || '',
    items: Array.isArray(order.items) ? order.items : [],
    discount: typeof order.discount === 'number' ? order.discount : 0,
    total: Number(order.total) || 0,
    status: order.status || 'Pending',
    payment_method: order.paymentMethod || 'cod',
    notes: notesVal || null,
    created_at: order.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function supabaseRowToOrder(row: SupabaseOrderRow): any {
  let rawNotes = row.notes || '';
  let meta: any = {};
  if (rawNotes.includes('__META__:') && rawNotes.includes('__ENDMETA__')) {
    try {
      const match = rawNotes.match(/__META__:(.*?)__ENDMETA__/);
      if (match && match[1]) {
        meta = JSON.parse(match[1]);
        rawNotes = rawNotes.replace(/__META__:.*?__ENDMETA__\s*/, '').trim();
      }
    } catch {}
  }

  return {
    id: row.id,
    invoiceNo: row.invoice_no || parseInt(String(row.id).replace(/[^0-9]/g, ''), 10) || undefined,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name || 'Customer',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    city: row.city || '',
    thana: row.thana || '',
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: meta.subtotal !== undefined ? meta.subtotal : undefined,
    deliveryCharge: meta.deliveryCharge !== undefined ? meta.deliveryCharge : 0,
    shippingCost: meta.shippingCost !== undefined ? meta.shippingCost : (meta.deliveryCharge || 0),
    discount: typeof row.discount === 'number' ? row.discount : 0,
    total: Number(row.total) || 0,
    status: row.status || 'Pending',
    paymentMethod: row.payment_method || 'cod',
    paymentStatus: meta.paymentStatus || 'Unpaid',
    courier: meta.courier || undefined,
    trackingId: meta.trackingId || undefined,
    courierStatus: meta.courierStatus || undefined,
    invoiceBy: meta.invoiceBy || undefined,
    notes: rawNotes,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
  };
}

export interface SupabaseProductRow {
  id: string;
  name: string;
  price: number;
  category: string;
  images: any;
  sizes: any;
  stock: number;
  size_stock: any;
  sku?: string | null;
  cost?: number | null;
  regular_price?: number | null;
  fabric?: string | null;
  fit_type?: string | null;
  description?: string | null;
  rating?: number | null;
  is_top_rated?: boolean;
  new_arrival?: boolean;
  featured?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function productToSupabaseRow(p: any): SupabaseProductRow {
  return {
    id: String(p.id),
    name: p.name || 'Unnamed Product',
    price: Number(p.price) || 0,
    category: p.category || 'General',
    images: Array.isArray(p.images) ? p.images : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    stock: Number(p.stock) || 0,
    size_stock: p.sizeStock && typeof p.sizeStock === 'object' ? p.sizeStock : {},
    sku: p.sku || null,
    cost: typeof p.cost === 'number' ? p.cost : null,
    regular_price: typeof p.regularPrice === 'number' ? p.regularPrice : null,
    fabric: p.fabric || null,
    fit_type: p.fitType || null,
    description: p.description || '',
    rating: typeof p.rating === 'number' ? p.rating : 0,
    is_top_rated: Boolean(p.isTopRated),
    new_arrival: Boolean(p.newArrival),
    featured: Boolean(p.featured),
    updated_at: new Date().toISOString()
  };
}

export function supabaseRowToProduct(row: SupabaseProductRow): any {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price) || 0,
    category: row.category || 'General',
    images: Array.isArray(row.images) ? row.images : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    stock: Number(row.stock) || 0,
    sizeStock: row.size_stock && typeof row.size_stock === 'object' ? row.size_stock : {},
    sku: row.sku || undefined,
    cost: row.cost || undefined,
    regularPrice: row.regular_price || undefined,
    fabric: row.fabric || undefined,
    fitType: row.fit_type || undefined,
    description: row.description || '',
    rating: row.rating || 0,
    isTopRated: Boolean(row.is_top_rated),
    newArrival: Boolean(row.new_arrival),
    featured: Boolean(row.featured)
  };
}

export async function checkSupabaseDataStatus() {
  try {
    const [prodRes, orderRes, custRes] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true })
    ]);

    return {
      connected: true,
      productsCount: prodRes.count ?? 0,
      ordersCount: orderRes.count ?? 0,
      customersCount: custRes.count ?? 0,
      error: null
    };
  } catch (err: any) {
    return {
      connected: false,
      productsCount: 0,
      ordersCount: 0,
      customersCount: 0,
      error: err?.message || 'Connection failed'
    };
  }
}


