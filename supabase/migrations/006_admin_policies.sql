-- ============================================
-- AXIS3 - ADMIN ROLE-BASED ACCESS CONTROL
-- Version: 1.0
-- Date: 2026-04-17
-- Description: Admin role policies for Hafta 7 preparation
-- ============================================

-- ============================================
-- ADMIN ROLE CHECK FUNCTION
-- ============================================

-- Function: Check if current user is admin
-- Returns true if user has admin role or axis3.com.tr email
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      -- Check if user has admin role in metadata
      (raw_user_meta_data->>'role' = 'admin')
      OR
      -- Check if user has axis3.com.tr email (internal staff)
      (email LIKE '%@axis3.com.tr')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_admin() IS 'Checks if current authenticated user has admin privileges';

-- ============================================
-- ADMIN POLICIES FOR MATERIALS
-- ============================================

-- Admins can insert materials
DROP POLICY IF EXISTS "Admins can insert materials" ON materials;
CREATE POLICY "Admins can insert materials"
ON materials FOR INSERT
WITH CHECK (is_admin());

-- Admins can update materials
DROP POLICY IF EXISTS "Admins can update materials" ON materials;
CREATE POLICY "Admins can update materials"
ON materials FOR UPDATE
USING (is_admin());

-- Admins can delete materials
DROP POLICY IF EXISTS "Admins can delete materials" ON materials;
CREATE POLICY "Admins can delete materials"
ON materials FOR DELETE
USING (is_admin());

-- ============================================
-- ADMIN POLICIES FOR PRINT_SETTINGS
-- ============================================

-- Admins can insert print settings
DROP POLICY IF EXISTS "Admins can insert print settings" ON print_settings;
CREATE POLICY "Admins can insert print settings"
ON print_settings FOR INSERT
WITH CHECK (is_admin());

-- Admins can update print settings
DROP POLICY IF EXISTS "Admins can update print settings" ON print_settings;
CREATE POLICY "Admins can update print settings"
ON print_settings FOR UPDATE
USING (is_admin());

-- Admins can delete print settings
DROP POLICY IF EXISTS "Admins can delete print settings" ON print_settings;
CREATE POLICY "Admins can delete print settings"
ON print_settings FOR DELETE
USING (is_admin());

-- ============================================
-- ADMIN POLICIES FOR BLOG_CATEGORIES
-- ============================================

-- Admins can insert blog categories
DROP POLICY IF EXISTS "Admins can insert blog categories" ON blog_categories;
CREATE POLICY "Admins can insert blog categories"
ON blog_categories FOR INSERT
WITH CHECK (is_admin());

-- Admins can update blog categories
DROP POLICY IF EXISTS "Admins can update blog categories" ON blog_categories;
CREATE POLICY "Admins can update blog categories"
ON blog_categories FOR UPDATE
USING (is_admin());

-- Admins can delete blog categories
DROP POLICY IF EXISTS "Admins can delete blog categories" ON blog_categories;
CREATE POLICY "Admins can delete blog categories"
ON blog_categories FOR DELETE
USING (is_admin());

-- ============================================
-- ADMIN POLICIES FOR BLOG_POSTS
-- ============================================

-- Admins can insert blog posts
DROP POLICY IF EXISTS "Admins can insert blog posts" ON blog_posts;
CREATE POLICY "Admins can insert blog posts"
ON blog_posts FOR INSERT
WITH CHECK (is_admin());

-- Admins can update any blog post
DROP POLICY IF EXISTS "Admins can update any blog post" ON blog_posts;
CREATE POLICY "Admins can update any blog post"
ON blog_posts FOR UPDATE
USING (is_admin());

-- Admins can delete any blog post
DROP POLICY IF EXISTS "Admins can delete any blog post" ON blog_posts;
CREATE POLICY "Admins can delete any blog post"
ON blog_posts FOR DELETE
USING (is_admin());

-- ============================================
-- ADMIN POLICIES FOR SYSTEM_SETTINGS
-- ============================================

-- Admins can insert system settings
DROP POLICY IF EXISTS "Admins can insert system settings" ON system_settings;
CREATE POLICY "Admins can insert system settings"
ON system_settings FOR INSERT
WITH CHECK (is_admin());

-- Admins can update system settings
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;
CREATE POLICY "Admins can update system settings"
ON system_settings FOR UPDATE
USING (is_admin());

-- Admins can delete system settings
DROP POLICY IF EXISTS "Admins can delete system settings" ON system_settings;
CREATE POLICY "Admins can delete system settings"
ON system_settings FOR DELETE
USING (is_admin());

-- Admins can view all system settings (including private)
DROP POLICY IF EXISTS "Admins can view all system settings" ON system_settings;
CREATE POLICY "Admins can view all system settings"
ON system_settings FOR SELECT
USING (is_admin());

-- ============================================
-- ADMIN POLICIES FOR ORDERS (VIEW ALL)
-- ============================================

-- Admins can view all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (is_admin());

-- Admins can update any order
DROP POLICY IF EXISTS "Admins can update any order" ON orders;
CREATE POLICY "Admins can update any order"
ON orders FOR UPDATE
USING (is_admin());

-- ============================================
-- ADMIN POLICIES FOR USERS (VIEW ALL)
-- ============================================

-- Admins can view all users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (is_admin());

-- Admins can update any user (e.g., suspend, verify)
DROP POLICY IF EXISTS "Admins can update any user" ON users;
CREATE POLICY "Admins can update any user"
ON users FOR UPDATE
USING (is_admin());

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission on is_admin function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test if admin function works
-- SELECT public.is_admin();

-- Test admin policies
-- SELECT * FROM materials; -- Should work for admins

-- ============================================
-- ADMIN POLICIES COMPLETE
-- ============================================
-- Total New Policies: 18
-- Security Level: ROLE-BASED
-- Admin Detection: Email domain + metadata
-- ============================================
