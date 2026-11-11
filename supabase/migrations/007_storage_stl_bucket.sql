-- =====================================================
-- MIGRATION 007: STL Files Storage Bucket & RLS
-- =====================================================
-- Purpose: Create secure storage bucket for STL files
-- Security: User-isolated folders with RLS policies
-- Date: 2026-04-18
-- =====================================================

-- 1. Create STL files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stl-files',
  'stl-files',
  false, -- Private bucket
  52428800, -- 50MB in bytes (50 * 1024 * 1024)
  ARRAY[
    'model/stl',
    'application/sla',
    'application/vnd.ms-pki.stl',
    'application/octet-stream' -- STL files sometimes detected as this
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policy: Users can only upload to their own folder
CREATE POLICY "Users can upload STL files to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stl-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. RLS Policy: Users can only read their own files
CREATE POLICY "Users can read their own STL files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'stl-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. RLS Policy: Users can update their own files
CREATE POLICY "Users can update their own STL files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stl-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'stl-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. RLS Policy: Users can delete their own files
CREATE POLICY "Users can delete their own STL files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stl-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Admin override policies (for admin panel)
CREATE POLICY "Admins can read all STL files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'stl-files' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete any STL files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stl-files' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- =====================================================
-- SECURITY NOTES:
-- =====================================================
-- 1. Folder structure: {user_id}/{file_id}.stl
-- 2. RLS ensures users can only access their own folder
-- 3. File size limit enforced at bucket level (50MB)
-- 4. MIME type validation at bucket level
-- 5. Admin users have read/delete access to all files
-- =====================================================
