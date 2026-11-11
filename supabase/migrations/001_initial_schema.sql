-- ============================================
-- AXIS3 - SUPABASE DATABASE MIGRATION
-- Version: 1.0
-- Date: 2026-04-17
-- Description: Complete database schema for Axis3 3D printing platform
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    company_name VARCHAR(255),
    is_corporate BOOLEAN DEFAULT FALSE,
    tax_number VARCHAR(50),
    tax_office VARCHAR(100),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_is_corporate ON users(is_corporate);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- 2. ADDRESSES TABLE
-- ============================================
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(2) DEFAULT 'TR',
    is_default BOOLEAN DEFAULT FALSE,
    address_type VARCHAR(20) DEFAULT 'shipping' CHECK (address_type IN ('shipping', 'billing', 'both')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(is_default);

-- ============================================
-- 3. FILES TABLE
-- ============================================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'model/stl',
    
    -- STL Analysis Results
    volume_cm3 DECIMAL(12, 4),
    surface_area_cm2 DECIMAL(12, 4),
    bounding_box_x DECIMAL(10, 2),
    bounding_box_y DECIMAL(10, 2),
    bounding_box_z DECIMAL(10, 2),
    triangle_count INTEGER,
    is_manifold BOOLEAN,
    has_errors BOOLEAN DEFAULT FALSE,
    error_details JSONB,
    
    -- Preview
    thumbnail_path TEXT,
    preview_data JSONB,
    
    -- Status
    analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (
        analysis_status IN ('pending', 'processing', 'completed', 'failed')
    ),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_analysis_status ON files(analysis_status);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_files_deleted_at ON files(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- 4. MATERIALS TABLE
-- ============================================
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    technology VARCHAR(20) NOT NULL CHECK (technology IN ('FDM', 'SLA')),
    
    -- Physical Properties
    density DECIMAL(5, 3) NOT NULL,
    cost_per_gram DECIMAL(10, 4) NOT NULL,
    
    -- Visual
    color VARCHAR(50),
    hex_color VARCHAR(7),
    image_url TEXT,
    
    -- Properties
    properties JSONB DEFAULT '{}',
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_materials_technology ON materials(technology);
CREATE INDEX idx_materials_is_active ON materials(is_active);
CREATE INDEX idx_materials_code ON materials(code);

-- ============================================
-- 5. PRINT_SETTINGS TABLE
-- ============================================
CREATE TABLE print_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    technology VARCHAR(20) NOT NULL CHECK (technology IN ('FDM', 'SLA')),
    
    -- FDM Settings
    layer_height DECIMAL(5, 3),
    infill_percentage INTEGER,
    print_speed INTEGER,
    
    -- SLA Settings
    layer_thickness DECIMAL(5, 3),
    exposure_time DECIMAL(5, 2),
    
    -- Pricing
    time_multiplier DECIMAL(5, 2) DEFAULT 1.0,
    price_multiplier DECIMAL(5, 2) DEFAULT 1.0,
    
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_print_settings_technology ON print_settings(technology);
CREATE INDEX idx_print_settings_is_active ON print_settings(is_active);

-- ============================================
-- 6. PRICE_CALCULATIONS TABLE
-- ============================================
CREATE TABLE price_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id),
    print_setting_id UUID NOT NULL REFERENCES print_settings(id),
    
    -- Calculation Details
    volume_cm3 DECIMAL(12, 4) NOT NULL,
    weight_grams DECIMAL(10, 2) NOT NULL,
    print_time_hours DECIMAL(8, 2) NOT NULL,
    
    -- Cost Breakdown
    material_cost DECIMAL(10, 2) NOT NULL,
    labor_cost DECIMAL(10, 2) NOT NULL,
    energy_cost DECIMAL(10, 2) NOT NULL,
    overhead_cost DECIMAL(10, 2) NOT NULL,
    
    -- Price
    base_price DECIMAL(10, 2) NOT NULL,
    profit_margin DECIMAL(5, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    
    -- Quantity Discounts
    quantity_discounts JSONB DEFAULT '{}',
    
    -- Metadata
    calculation_params JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_price_calculations_file_id ON price_calculations(file_id);
CREATE INDEX idx_price_calculations_created_at ON price_calculations(created_at DESC);
CREATE INDEX idx_price_calculations_expires_at ON price_calculations(expires_at);

-- ============================================
-- 7. ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Address Information (Snapshot)
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    
    -- Price Information
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending' CHECK (
        status IN (
            'pending', 'payment_received', 'preparing', 
            'printing', 'quality_check', 'packaging', 
            'shipped', 'delivered', 'cancelled', 'refunded'
        )
    ),
    
    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,
    
    -- Shipping
    shipping_method VARCHAR(50),
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Cancellation/Refund
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refund_amount DECIMAL(10, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- 8. ORDER_ITEMS TABLE
-- ============================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id),
    price_calculation_id UUID REFERENCES price_calculations(id),
    
    -- Product Details (Snapshot)
    filename VARCHAR(255) NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    print_setting_name VARCHAR(100) NOT NULL,
    
    -- Quantity and Price
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    
    -- Production Status
    production_status VARCHAR(30) DEFAULT 'pending' CHECK (
        production_status IN (
            'pending', 'printing', 'completed', 'failed', 'reprinting'
        )
    ),
    
    -- Production Details
    print_started_at TIMESTAMPTZ,
    print_completed_at TIMESTAMPTZ,
    print_duration_minutes INTEGER,
    printer_id VARCHAR(50),
    
    -- Quality Control
    quality_check_passed BOOLEAN,
    quality_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_file_id ON order_items(file_id);
CREATE INDEX idx_order_items_production_status ON order_items(production_status);

-- ============================================
-- 9. ORDER_STATUS_HISTORY TABLE
-- ============================================
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- ============================================
-- 10. PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    
    -- Payment Information
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    
    -- Gateway Information
    gateway VARCHAR(50) DEFAULT 'iyzico',
    transaction_id VARCHAR(255),
    conversation_id VARCHAR(255),
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')
    ),
    
    -- Details
    gateway_response JSONB,
    error_message TEXT,
    
    -- Dates
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ============================================
-- 11. BLOG_CATEGORIES TABLE
-- ============================================
CREATE TABLE blog_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES blog_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX idx_blog_categories_parent_id ON blog_categories(parent_id);

-- ============================================
-- 12. BLOG_POSTS TABLE
-- ============================================
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES blog_categories(id),
    author_id UUID REFERENCES users(id),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_category_id ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- ============================================
-- 13. SYSTEM_SETTINGS TABLE
-- ============================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);

-- ============================================
-- 14. AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_settings_updated_at BEFORE UPDATE ON print_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_categories_updated_at BEFORE UPDATE ON blog_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Total Tables: 14
-- Total Indexes: 50+
-- Total Triggers: 11
-- ============================================
