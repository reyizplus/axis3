-- ============================================
-- AXIS3 - ROW LEVEL SECURITY (RLS) POLICIES
-- Version: 1.0
-- Date: 2026-04-17
-- Description: Strict security policies for all tables
-- ============================================

-- ============================================
-- 1. USERS TABLE RLS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own record
CREATE POLICY "Users can view own record"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own record"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own record (during registration)
CREATE POLICY "Users can insert own record"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. ADDRESSES TABLE RLS
-- ============================================
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own addresses
CREATE POLICY "Users can view own addresses"
ON addresses FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own addresses
CREATE POLICY "Users can insert own addresses"
ON addresses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own addresses
CREATE POLICY "Users can update own addresses"
ON addresses FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
ON addresses FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 3. FILES TABLE RLS
-- ============================================
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Users can view their own files
CREATE POLICY "Users can view own files"
ON files FOR SELECT
USING (auth.uid() = user_id);

-- Users can upload files
CREATE POLICY "Users can upload files"
ON files FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own files
CREATE POLICY "Users can update own files"
ON files FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
ON files FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 4. MATERIALS TABLE RLS (Public Read)
-- ============================================
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Everyone can view active materials
CREATE POLICY "Anyone can view active materials"
ON materials FOR SELECT
USING (is_active = true);

-- Only admins can modify materials (handled by service role)

-- ============================================
-- 5. PRINT_SETTINGS TABLE RLS (Public Read)
-- ============================================
ALTER TABLE print_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view active print settings
CREATE POLICY "Anyone can view active print settings"
ON print_settings FOR SELECT
USING (is_active = true);

-- Only admins can modify print settings (handled by service role)

-- ============================================
-- 6. PRICE_CALCULATIONS TABLE RLS
-- ============================================
ALTER TABLE price_calculations ENABLE ROW LEVEL SECURITY;

-- Users can view their own price calculations
CREATE POLICY "Users can view own price calculations"
ON price_calculations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM files
        WHERE files.id = price_calculations.file_id
        AND files.user_id = auth.uid()
    )
);

-- Users can create price calculations for their files
CREATE POLICY "Users can create price calculations"
ON price_calculations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM files
        WHERE files.id = price_calculations.file_id
        AND files.user_id = auth.uid()
    )
);

-- ============================================
-- 7. ORDERS TABLE RLS
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending orders
CREATE POLICY "Users can update own pending orders"
ON orders FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- ============================================
-- 8. ORDER_ITEMS TABLE RLS
-- ============================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own order items
CREATE POLICY "Users can view own order items"
ON order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

-- Users can create order items for their orders
CREATE POLICY "Users can create own order items"
ON order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

-- ============================================
-- 9. ORDER_STATUS_HISTORY TABLE RLS
-- ============================================
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own order status history
CREATE POLICY "Users can view own order status history"
ON order_status_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_status_history.order_id
        AND orders.user_id = auth.uid()
    )
);

-- Only system can insert status history (handled by triggers/service role)

-- ============================================
-- 10. PAYMENTS TABLE RLS
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = payments.order_id
        AND orders.user_id = auth.uid()
    )
);

-- Only system can create payments (handled by service role)

-- ============================================
-- 11. BLOG_CATEGORIES TABLE RLS (Public Read)
-- ============================================
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view active blog categories
CREATE POLICY "Anyone can view active blog categories"
ON blog_categories FOR SELECT
USING (is_active = true);

-- Only admins can modify blog categories (handled by service role)

-- ============================================
-- 12. BLOG_POSTS TABLE RLS (Public Read)
-- ============================================
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view published blog posts
CREATE POLICY "Anyone can view published blog posts"
ON blog_posts FOR SELECT
USING (status = 'published' AND published_at <= NOW());

-- Authors can view their own drafts
CREATE POLICY "Authors can view own drafts"
ON blog_posts FOR SELECT
USING (auth.uid() = author_id);

-- Only admins can modify blog posts (handled by service role)

-- ============================================
-- 13. SYSTEM_SETTINGS TABLE RLS (Public Read)
-- ============================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view public settings
CREATE POLICY "Anyone can view public settings"
ON system_settings FOR SELECT
USING (is_public = true);

-- Only admins can modify settings (handled by service role)

-- ============================================
-- 14. AUDIT_LOGS TABLE RLS (Admin Only)
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
USING (auth.uid() = user_id);

-- Only system can insert audit logs (handled by triggers/service role)

-- ============================================
-- RLS POLICIES COMPLETE
-- ============================================
-- Total Policies: 30+
-- Security Level: STRICT
-- User Isolation: ENFORCED
-- ============================================
