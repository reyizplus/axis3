-- Performance Optimization: Additional Database Indexes
-- Migration 015: Add composite indexes for frequently used queries
-- Created: 2026-04-20

-- ============================================================================
-- ORDERS TABLE - Composite Indexes for Common Query Patterns
-- ============================================================================

-- User's orders filtered by status (dashboard, admin panel)
CREATE INDEX IF NOT EXISTS idx_orders_user_status
ON orders(user_id, status);

-- User's recent orders (dashboard)
CREATE INDEX IF NOT EXISTS idx_orders_user_created
ON orders(user_id, created_at DESC);

-- Payment status queries with user filter
CREATE INDEX IF NOT EXISTS idx_orders_user_payment_status
ON orders(user_id, payment_status);

-- Admin order search by status and date
CREATE INDEX IF NOT EXISTS idx_orders_status_created
ON orders(status, created_at DESC);

-- Payment token lookup for idempotency check
CREATE INDEX IF NOT EXISTS idx_orders_payment_token 
ON orders(payment_token) 
WHERE payment_token IS NOT NULL;

-- ============================================================================
-- ORDER_ITEMS TABLE - Production and File Queries
-- ============================================================================

-- Order items by production status (production dashboard)
CREATE INDEX IF NOT EXISTS idx_order_items_production_created
ON order_items(production_status, created_at DESC);

-- File's order items (file detail page)
CREATE INDEX IF NOT EXISTS idx_order_items_file_order
ON order_items(file_id, order_id);

-- ============================================================================
-- FILES TABLE - User File Queries
-- ============================================================================

-- User's files by analysis status (upload page)
CREATE INDEX IF NOT EXISTS idx_files_user_analysis 
ON files(user_id, analysis_status) 
WHERE deleted_at IS NULL;

-- User's recent files (dashboard)
CREATE INDEX IF NOT EXISTS idx_files_user_created 
ON files(user_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- PRICE_CALCULATIONS TABLE - Pricing Queries
-- ============================================================================

-- File's valid price calculations (not expired)
CREATE INDEX IF NOT EXISTS idx_price_calc_file_valid
ON price_calculations(file_id, expires_at);

-- ============================================================================
-- USERS TABLE - Authentication and Admin Queries
-- ============================================================================

-- Active users by email (login, search)
CREATE INDEX IF NOT EXISTS idx_users_email_status 
ON users(email, status) 
WHERE deleted_at IS NULL;

-- Corporate users (admin reports)
CREATE INDEX IF NOT EXISTS idx_users_corporate_status 
ON users(is_corporate, status) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- MATERIALS & PRINT_SETTINGS - Active Items Queries
-- ============================================================================

-- Active materials by technology (pricing page)
CREATE INDEX IF NOT EXISTS idx_materials_tech_active 
ON materials(technology, is_active) 
WHERE is_active = true;

-- Active print settings by technology (pricing page)
CREATE INDEX IF NOT EXISTS idx_print_settings_tech_active 
ON print_settings(technology, is_active) 
WHERE is_active = true;

-- ============================================================================
-- AUDIT_LOGS - Admin Monitoring
-- ============================================================================

-- User activity logs (admin user detail)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
ON audit_logs(user_id, created_at DESC);

-- Entity audit trail (admin entity detail)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created 
ON audit_logs(entity_type, entity_id, created_at DESC);

-- ============================================================================
-- BLOG_POSTS - Public Content Queries
-- ============================================================================

-- Published posts by category (blog page)
CREATE INDEX IF NOT EXISTS idx_blog_posts_cat_published 
ON blog_posts(category_id, published_at DESC) 
WHERE status = 'published';

-- Published posts search (blog search)
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published 
ON blog_posts(status, published_at DESC) 
WHERE status = 'published';

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- These indexes are designed to optimize:
-- 1. User dashboard queries (orders, files)
-- 2. Admin panel queries (order management, user management)
-- 3. Payment processing (idempotency checks)
-- 4. Production tracking (order items by status)
-- 5. Pricing calculations (material/setting lookups)
-- 6. Audit logging (user activity, entity changes)
-- 7. Public content (blog posts)

-- Index Maintenance:
-- - Indexes are created with IF NOT EXISTS to allow safe re-runs
-- - Partial indexes (WHERE clauses) reduce index size
-- - Composite indexes follow query patterns (most selective column first)
-- - DESC indexes for timestamp columns (recent items first)

-- Monitoring:
-- Run this query to check index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan ASC;

-- To find unused indexes:
-- SELECT schemaname, tablename, indexname
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_toast%';
