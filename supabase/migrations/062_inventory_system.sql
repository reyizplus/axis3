-- ============================================
-- AXIS3 - INVENTORY & PRE-ORDER SYSTEM
-- Version: 1.0
-- Description: inventory_items, nozzle_sizes, preorder fields
-- ============================================

-- ============================================
-- 1. NOZZLE SIZES
-- ============================================
CREATE TABLE nozzle_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    size_mm DECIMAL(4,2) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    compatible_technology VARCHAR(20) DEFAULT 'FDM' CHECK (compatible_technology IN ('FDM', 'SLA')),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nozzle_sizes_active ON nozzle_sizes(is_active);
CREATE INDEX idx_nozzle_sizes_sort ON nozzle_sizes(sort_order);

-- Default nozzle sizes
INSERT INTO nozzle_sizes (size_mm, display_name, compatible_technology, sort_order) VALUES
    (0.20, '0.2mm İnce Nozul', 'FDM', 0),
    (0.40, '0.4mm Standart Nozul', 'FDM', 1),
    (0.60, '0.6mm Kalın Nozul', 'FDM', 2),
    (0.80, '0.8mm Çok Kalın Nozul', 'FDM', 3)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. INVENTORY ITEMS
-- ============================================
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('filament', 'nozzle', 'resin', 'other')),

    -- Common
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER DEFAULT 5,
    unit_cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,

    -- Filament fields
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    color VARCHAR(50),
    hex_color VARCHAR(7),
    spool_weight_grams DECIMAL(8,2),

    -- Nozzle fields
    nozzle_size_id UUID REFERENCES nozzle_sizes(id) ON DELETE SET NULL,

    -- Pre-order
    allow_preorder BOOLEAN DEFAULT TRUE,
    preorder_discount_percent DECIMAL(5,2) DEFAULT NULL,
    estimated_restock_days INTEGER DEFAULT 14,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_type ON inventory_items(type);
CREATE INDEX idx_inventory_items_material ON inventory_items(material_id);
CREATE INDEX idx_inventory_items_nozzle ON inventory_items(nozzle_size_id);
CREATE INDEX idx_inventory_items_active ON inventory_items(is_active);
CREATE INDEX idx_inventory_items_stock ON inventory_items(quantity_on_hand);

-- ============================================
-- 3. MATERIALS — ADD PRE-ORDER COLUMNS
-- ============================================
ALTER TABLE materials
    ADD COLUMN IF NOT EXISTS preorder_allowed BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS preorder_discount_percent DECIMAL(5,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS estimated_restock_days INTEGER DEFAULT 14;

-- ============================================
-- 4. PRINT SETTINGS — ADD NOZZLE LINK
-- ============================================
ALTER TABLE print_settings
    ADD COLUMN IF NOT EXISTS requires_nozzle_size_id UUID REFERENCES nozzle_sizes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_print_settings_nozzle ON print_settings(requires_nozzle_size_id);

-- ============================================
-- 5. ORDER ITEMS — ADD PRE-ORDER FIELDS
-- ============================================
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS preorder_discount_percent DECIMAL(5,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS estimated_restock_days INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_preorder ON order_items(is_preorder);

-- ============================================
-- 6. GLOBAL SETTINGS — PRE-ORDER DEFAULTS
-- ============================================
INSERT INTO public.global_settings (key, value, description, category) VALUES
    ('default_preorder_discount_percent', '{"value": 10, "unit": "percentage"}', 'Varsayılan ön sipariş indirim yüzdesi', 'pricing'),
    ('preorder_enabled', '{"value": true, "unit": "boolean"}', 'Ön sipariş sistemi aktif/pasif', 'operations')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- nozzle_sizes: everyone can read active, only admin can write
ALTER TABLE nozzle_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active nozzle sizes"
    ON nozzle_sizes FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins can insert nozzle sizes"
    ON nozzle_sizes FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update nozzle sizes"
    ON nozzle_sizes FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete nozzle sizes"
    ON nozzle_sizes FOR DELETE
    USING (public.is_admin());

-- inventory_items: everyone can read active, only admin can write
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active inventory items"
    ON inventory_items FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins can insert inventory items"
    ON inventory_items FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update inventory items"
    ON inventory_items FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete inventory items"
    ON inventory_items FOR DELETE
    USING (public.is_admin());

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
