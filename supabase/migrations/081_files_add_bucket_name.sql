-- Migration: Add bucket_name column to files table
-- Enables bucket-aware operations (signed URLs, deletes) for image vs STL files

ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS bucket_name TEXT NOT NULL DEFAULT 'stl-files';

-- Update existing image records based on mime_type
UPDATE public.files
SET bucket_name = 'images'
WHERE mime_type LIKE 'image/%' AND bucket_name = 'stl-files';

CREATE INDEX IF NOT EXISTS idx_files_bucket_name ON public.files(bucket_name);
