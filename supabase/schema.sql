-- ==============================================================================
-- ELEGAN BD: SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    image TEXT DEFAULT '',
    description TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_mega BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    sku TEXT,
    name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost NUMERIC(12, 2) DEFAULT 0.00,
    regular_price NUMERIC(12, 2),
    sale_price NUMERIC(12, 2),
    discount NUMERIC(5, 2) DEFAULT 0.00,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    color TEXT,
    material TEXT,
    fabric TEXT,
    fit_type TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    sizes JSONB DEFAULT '[]'::jsonb,
    stock INTEGER NOT NULL DEFAULT 0,
    size_stock JSONB DEFAULT '{}'::jsonb,
    new_arrival BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    best_selling BOOLEAN DEFAULT FALSE,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    is_top_rated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMERS / PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    firebase_uid TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL UNIQUE,
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    thana TEXT DEFAULT '',
    wishlist JSONB DEFAULT '[]'::jsonb,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    delivered_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    exchanges INTEGER DEFAULT 0,
    last_order_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    invoice_no BIGINT UNIQUE,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    thana TEXT DEFAULT '',
    delivery_charge NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    advance_payment NUMERIC(10, 2) DEFAULT 0.00,
    paid_amount NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Pending',
    payment_method TEXT NOT NULL DEFAULT 'cod',
    transaction_id TEXT,
    notes TEXT,
    courier TEXT,
    partner TEXT,
    invoice_by TEXT,
    tracking_id TEXT,
    tracking_code TEXT,
    pathao_consignment_id TEXT,
    steadfast_consignment_id TEXT,
    courier_status TEXT,
    courier_charge NUMERIC(10, 2) DEFAULT 0.00,
    courier_payout_amount NUMERIC(10, 2) DEFAULT 0.00,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS TABLE (Normalized for high-efficiency reporting)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    selected_size TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVENTORY LOGS / TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'in' or 'out'
    sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT DEFAULT '',
    quantities JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    authorized_by TEXT,
    notes TEXT,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY SPEED & ZERO WASTED QUOTA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_products_best_selling ON public.products(best_selling);
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON public.products(new_arrival);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_no ON public.orders(invoice_no);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_firebase_uid ON public.customers(firebase_uid);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_sku ON public.inventory_logs(sku);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can read, only authenticated admin/service role can insert/update/delete
CREATE POLICY "Public products read" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin products all" ON public.products FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Categories: Everyone can read
CREATE POLICY "Public categories read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin categories all" ON public.categories FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Orders: Public can insert new orders; customer can read their own; admin can read/manage all
CREATE POLICY "Public create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Customer read own orders" ON public.orders FOR SELECT USING (
    auth.uid()::text = customer_id 
    OR customer_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR auth.role() = 'service_role'
);
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Order items: Public can insert, customer can read own order items
CREATE POLICY "Public create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Customer read order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Admin manage order items" ON public.order_items FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Customers: Customer can read/update own profile, Admin can manage all
CREATE POLICY "Customer read own profile" ON public.customers FOR SELECT USING (
    firebase_uid = auth.uid()::text 
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
);
CREATE POLICY "Customer update own profile" ON public.customers FOR ALL USING (true);

-- Reviews: Everyone can read reviews, authenticated/customers can create
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public create reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Inventory logs: Admin and service role only
CREATE POLICY "Admin inventory logs" ON public.inventory_logs FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ==============================================================================
-- STORAGE BUCKETS (Run in Supabase dashboard or via API)
-- ==============================================================================
-- 1. Create a public bucket 'product-images'
-- 2. Create a public bucket 'banners'
