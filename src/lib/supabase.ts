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
  subtotal?: number | null;
  shipping_cost?: number | null;
  discount?: number | null;
  total: number;
  status: string;
  payment_method?: string | null;
  payment_status?: string | null;
  courier?: string | null;
  tracking_id?: string | null;
  courier_status?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function orderToSupabaseRow(order: any): SupabaseOrderRow {
  return {
    id: String(order.id),
    invoice_no: typeof order.invoiceNo === 'number' ? order.invoiceNo : (Number(order.invoiceNo) || null),
    customer_id: order.customerId || null,
    customer_name: order.customerName || (order.shippingAddress?.fullName) || 'Valued Customer',
    phone: order.phone || (order.shippingAddress?.phone) || null,
    email: order.email || null,
    address: order.address || (order.shippingAddress?.address) || null,
    city: order.city || (order.shippingAddress?.city) || null,
    thana: order.thana || (order.shippingAddress?.thana) || null,
    items: Array.isArray(order.items) ? order.items : [],
    subtotal: typeof order.subtotal === 'number' ? order.subtotal : (Number(order.subtotal) || null),
    shipping_cost: typeof order.deliveryCharge === 'number' ? order.deliveryCharge : (typeof order.shippingCost === 'number' ? order.shippingCost : 0),
    discount: typeof order.discount === 'number' ? order.discount : 0,
    total: Number(order.total) || 0,
    status: order.status || 'Pending',
    payment_method: order.paymentMethod || 'cod',
    payment_status: order.paymentStatus || 'Unpaid',
    courier: order.courier || null,
    tracking_id: order.trackingId || (order.steadfastTracking?.consignment_id ? String(order.steadfastTracking.consignment_id) : null),
    courier_status: order.courierStatus || (order.steadfastTracking?.status) || null,
    notes: order.notes || null,
    created_at: order.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function supabaseRowToOrder(row: SupabaseOrderRow): any {
  return {
    id: row.id,
    invoiceNo: row.invoice_no || parseInt(row.id, 10) || undefined,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name || 'Customer',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    city: row.city || '',
    thana: row.thana || '',
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: row.subtotal || undefined,
    deliveryCharge: row.shipping_cost || 0,
    shippingCost: row.shipping_cost || 0,
    discount: row.discount || 0,
    total: Number(row.total) || 0,
    status: row.status || 'Pending',
    paymentMethod: row.payment_method || 'cod',
    paymentStatus: row.payment_status || 'Unpaid',
    courier: row.courier || undefined,
    trackingId: row.tracking_id || undefined,
    courierStatus: row.courier_status || undefined,
    notes: row.notes || '',
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


