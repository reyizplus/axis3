-- Migration 022: Add Admin Policies for Order Items, Files, and Storage
-- Problem: Admins can see all orders but not order_items, files, and storage from non-admin users
-- Solution: Add admin SELECT policies for order_items, files tables and storage bucket

-- Add admin policy for order_items
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
CREATE POLICY "Admins can view all order items"
ON order_items FOR SELECT
USING (public.is_admin());

-- Add admin policy for files (so admins can view all user files)
DROP POLICY IF EXISTS "Admins can view all files" ON files;
CREATE POLICY "Admins can view all files"
ON files FOR SELECT
USING (public.is_admin());

-- Fix admin storage policy (was using role='admin' which doesn't exist)
-- Drop old broken policy
DROP POLICY IF EXISTS "Admins can read all STL files" ON storage.objects;

-- Create new policy using is_admin() function
CREATE POLICY "Admins can read all STL files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'stl-files'
  AND public.is_admin()
);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Admin policy added for order_items';
  RAISE NOTICE '✓ Admin policy added for files';
  RAISE NOTICE '✓ Admin storage policy fixed (now uses is_admin())';
  RAISE NOTICE 'Admins can now view all order items, files, and storage from all users';
END $$;
