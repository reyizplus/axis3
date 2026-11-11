-- ============================================
-- AXIS3 - SUPABASE STORAGE CONFIGURATION
-- Version: 1.0
-- Date: 2026-04-17
-- Description: Storage buckets and policies for STL files
-- ============================================

-- ============================================
-- STORAGE BUCKET: stl-files
-- ============================================
-- This bucket stores user-uploaded STL files
-- Max file size: 100MB
-- Allowed MIME types: model/stl, application/sla, application/octet-stream
-- ============================================

-- Create bucket (execute via Supabase Dashboard or API)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'stl-files',
--     'stl-files',
--     false,
--     104857600,  -- 100MB in bytes
--     ARRAY['model/stl', 'application/sla', 'application/octet-stream', 'application/vnd.ms-pki.stl']
-- );

-- ============================================
-- STORAGE POLICIES: stl-files
-- ============================================

-- Policy 1: Users can upload their own STL files
CREATE POLICY "Users can upload own STL files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'stl-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Users can view their own STL files
CREATE POLICY "Users can view own STL files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'stl-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can update their own STL files
CREATE POLICY "Users can update own STL files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'stl-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own STL files
CREATE POLICY "Users can delete own STL files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'stl-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- STORAGE BUCKET: thumbnails
-- ============================================
-- This bucket stores 3D model thumbnails/previews
-- Max file size: 5MB
-- Allowed MIME types: image/png, image/jpeg, image/webp
-- ============================================

-- Create bucket (execute via Supabase Dashboard or API)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'thumbnails',
--     'thumbnails',
--     true,  -- Public for easy access
--     5242880,  -- 5MB in bytes
--     ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/jpg']
-- );

-- ============================================
-- STORAGE POLICIES: thumbnails
-- ============================================

-- Policy 1: Users can upload their own thumbnails
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Anyone can view thumbnails (public bucket)
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Policy 3: Users can update their own thumbnails
CREATE POLICY "Users can update own thumbnails"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- STORAGE CONFIGURATION NOTES
-- ============================================
-- 
-- File Organization:
-- - STL files: stl-files/{user_id}/{file_id}.stl
-- - Thumbnails: thumbnails/{user_id}/{file_id}.png
--
-- Security:
-- - STL files: Private, user-isolated
-- - Thumbnails: Public, but user-isolated for uploads
--
-- Limits:
-- - STL files: 100MB max
-- - Thumbnails: 5MB max
--
-- MIME Types:
-- - STL: model/stl, application/sla, application/octet-stream
-- - Thumbnails: image/png, image/jpeg, image/webp
--
-- ============================================
