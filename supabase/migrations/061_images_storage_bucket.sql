-- ============================================
-- AXIS3 - IMAGES STORAGE BUCKET
-- Version: 1.0
-- Description: Storage bucket for blog & product images
-- ============================================

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('images', 'images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS POLICIES FOR images BUCKET
-- ============================================

-- Policy 1: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'images' AND
    auth.role() = 'authenticated'
);

-- Policy 2: Anyone can view images (public bucket)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Policy 3: Image owners can update their images
CREATE POLICY "Image owners can update images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Image owners can delete their images
CREATE POLICY "Image owners can delete images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 5: Admins can delete any image
CREATE POLICY "Admins can delete any image"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'images' AND
    public.is_admin()
);
