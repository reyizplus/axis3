-- ============================================
-- FIX: is_admin() function to use auth.users
-- Date: 2026-04-18
-- Issue: Function was using public.users which doesn't have raw_user_meta_data
-- Solution: Use auth.users table instead
-- Note: Using CREATE OR REPLACE instead of DROP to avoid cascade issues
-- ============================================

-- Simply replace the function (no need to drop)
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
COMMENT ON FUNCTION public.is_admin() IS 'Checks if current authenticated user has admin privileges by checking auth.users table';
