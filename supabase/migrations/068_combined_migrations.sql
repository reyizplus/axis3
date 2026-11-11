-- ============================================
-- AXIS3 - COMBINED MIGRATION 068
-- Includes: 059 (store), 066 (SLA params), 067 (payment status),
--           1000 (pricing RLS), 1001 (updated_at triggers)
-- ============================================
-- WARNING: Sipariş sırası önemlidir, aşağıdaki gibi uygulanmalıdır.
-- ============================================

-- ======================================================================
-- PART 1: E-COMMERCE STORE MODULE (formerly 059)
-- ======================================================================

-- 1. STORE CATEGORIES
CREATE TABLE IF NOT EXISTS store_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES store_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    seo_title VARCHAR(200),
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_categories_slug ON store_categories(slug);
CREATE INDEX IF NOT EXISTS idx_store_categories_parent_id ON store_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_is_active ON store_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_store_categories_sort_order ON store_categories(sort_order);

-- 2. STORE PRODUCTS
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL,
    name VARCHAR(300) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(10, 2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
    cost_price DECIMAL(10, 2) CHECK (cost_price IS NULL OR cost_price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    track_stock BOOLEAN DEFAULT TRUE,
    allow_backorder BOOLEAN DEFAULT FALSE,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    weight_grams DECIMAL(10, 2),
    unit VARCHAR(50) DEFAULT 'adet',
    main_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    seo_title VARCHAR(200),
    seo_description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_products_slug ON store_products(slug);
CREATE INDEX IF NOT EXISTS idx_store_products_category_id ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_is_active ON store_products(is_active);
CREATE INDEX IF NOT EXISTS idx_store_products_is_featured ON store_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_store_products_price ON store_products(price);
CREATE INDEX IF NOT EXISTS idx_store_products_created_at ON store_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_products_sort_order ON store_products(sort_order);
CREATE INDEX IF NOT EXISTS idx_store_products_deleted_at ON store_products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_products_sku ON store_products(sku);
CREATE INDEX IF NOT EXISTS idx_store_products_name_trgm ON store_products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_store_products_description_trgm ON store_products USING gin (description gin_trgm_ops);

-- 3. STORE PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS store_product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(300),
    sort_order INTEGER DEFAULT 0,
    is_main BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_product_images_product_id ON store_product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_store_product_images_sort_order ON store_product_images(sort_order);

-- 4. STORE ORDER ITEMS
CREATE TABLE IF NOT EXISTS store_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
    product_name VARCHAR(300) NOT NULL,
    product_slug VARCHAR(300) NOT NULL,
    sku VARCHAR(100),
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal DECIMAL(10, 2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order_id ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product_id ON store_order_items(product_id);

-- 5. RPC FUNCTION: DECREMENT STOCK
CREATE OR REPLACE FUNCTION decrement_store_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS VOID AS $$
BEGIN
    UPDATE store_products
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id
    AND stock_quantity >= p_quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS POLICIES
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;

-- store_categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON store_categories;
CREATE POLICY "Anyone can view active categories" ON store_categories FOR SELECT
USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admins can insert categories" ON store_categories;
CREATE POLICY "Admins can insert categories" ON store_categories FOR INSERT
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON store_categories;
CREATE POLICY "Admins can update categories" ON store_categories FOR UPDATE
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON store_categories;
CREATE POLICY "Admins can delete categories" ON store_categories FOR DELETE
USING (is_admin());

-- store_products
DROP POLICY IF EXISTS "Anyone can view active products" ON store_products;
CREATE POLICY "Anyone can view active products" ON store_products FOR SELECT
USING ((is_active = TRUE AND deleted_at IS NULL) OR is_admin());

DROP POLICY IF EXISTS "Admins can insert products" ON store_products;
CREATE POLICY "Admins can insert products" ON store_products FOR INSERT
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON store_products;
CREATE POLICY "Admins can update products" ON store_products FOR UPDATE
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON store_products;
CREATE POLICY "Admins can delete products" ON store_products FOR DELETE
USING (is_admin());

-- store_product_images
DROP POLICY IF EXISTS "Anyone can view product images" ON store_product_images;
CREATE POLICY "Anyone can view product images" ON store_product_images FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Admins can insert product images" ON store_product_images;
CREATE POLICY "Admins can insert product images" ON store_product_images FOR INSERT
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update product images" ON store_product_images;
CREATE POLICY "Admins can update product images" ON store_product_images FOR UPDATE
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete product images" ON store_product_images;
CREATE POLICY "Admins can delete product images" ON store_product_images FOR DELETE
USING (is_admin());

-- store_order_items
DROP POLICY IF EXISTS "Users can view own store order items" ON store_order_items;
CREATE POLICY "Users can view own store order items" ON store_order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = store_order_items.order_id
        AND (orders.user_id = auth.uid() OR is_admin())
    )
);

DROP POLICY IF EXISTS "Users can insert own store order items" ON store_order_items;
CREATE POLICY "Users can insert own store order items" ON store_order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = store_order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admins can update store order items" ON store_order_items;
CREATE POLICY "Admins can update store order items" ON store_order_items FOR UPDATE
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete store order items" ON store_order_items;
CREATE POLICY "Admins can delete store order items" ON store_order_items FOR DELETE
USING (is_admin());


-- ======================================================================
-- PART 2: ADD SLA CUSTOM PARAMS TO ORDER ITEMS (formerly 066)
-- ======================================================================

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS custom_layer_thickness DECIMAL(5,3),
    ADD COLUMN IF NOT EXISTS custom_exposure_time DECIMAL(5,2);


-- ======================================================================
-- PART 3: ADD AWAITING_CONFIRMATION PAYMENT STATUS (formerly 067)
-- ======================================================================

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check
CHECK (payment_status IN ('pending', 'awaiting_confirmation', 'paid', 'failed', 'refunded'));

COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, awaiting_confirmation, paid, failed, refunded';


-- ======================================================================
-- PART 4: FIX PRICING HISTORY RLS (formerly 1000)
-- ======================================================================

DROP POLICY IF EXISTS "System can insert pricing history" ON public.pricing_history;

DROP POLICY IF EXISTS "Users can insert their own pricing history" ON public.pricing_history;
CREATE POLICY "Users can insert their own pricing history"
  ON public.pricing_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = pricing_history.file_id
      AND files.user_id = auth.uid()
    )
  );


-- ======================================================================
-- PART 5: ADD UPDATED_AT TRIGGERS (formerly 1001)
-- ======================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_store_products_updated_at ON public.store_products;
CREATE TRIGGER update_store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_categories_updated_at ON public.store_categories;
CREATE TRIGGER update_store_categories_updated_at
  BEFORE UPDATE ON public.store_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nozzle_sizes_updated_at ON public.nozzle_sizes;
CREATE TRIGGER update_nozzle_sizes_updated_at
  BEFORE UPDATE ON public.nozzle_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Atomic inventory deduction (prevents race conditions in deductStock)
CREATE OR REPLACE FUNCTION deduct_inventory_stock(
    p_material_id UUID,
    p_color VARCHAR,
    p_quantity INTEGER,
    p_nozzle_size_id UUID DEFAULT NULL,
    p_technology VARCHAR DEFAULT 'FDM'
) RETURNS JSONB AS $$
DECLARE
    v_remaining INTEGER := p_quantity;
    v_item RECORD;
    v_deducted INTEGER;
    v_short INTEGER := 0;
BEGIN
    FOR v_item IN
        SELECT id, quantity_on_hand
        FROM inventory_items
        WHERE material_id = p_material_id
          AND color = p_color
          AND is_active = TRUE
          AND quantity_on_hand > 0
          AND (p_nozzle_size_id IS NULL OR nozzle_size_id = p_nozzle_size_id)
          AND type = CASE WHEN p_technology = 'SLA' THEN 'resin' ELSE 'filament' END
        ORDER BY created_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;

        v_deducted := LEAST(v_item.quantity_on_hand, v_remaining);
        UPDATE inventory_items
        SET quantity_on_hand = quantity_on_hand - v_deducted
        WHERE id = v_item.id;

        v_remaining := v_remaining - v_deducted;
    END LOOP;

    IF v_remaining > 0 THEN
        v_short := v_remaining;
    END IF;

    RETURN jsonb_build_object('deducted', p_quantity - v_short, 'short', v_short);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add url_token column for password reset (prevents exposing full token in URL)
ALTER TABLE IF EXISTS public.password_reset_tokens
    ADD COLUMN IF NOT EXISTS url_token VARCHAR(32) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_url_token
    ON public.password_reset_tokens(url_token);

