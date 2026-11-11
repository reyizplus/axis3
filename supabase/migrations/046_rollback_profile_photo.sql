-- Rollback Migration: Remove Profile Photo System
-- This migration removes the avatar_url column and avatars storage bucket
-- Created: 2026-04-23

-- IMPORTANT: Storage bucket must be deleted manually via Supabase Dashboard
-- Go to Storage > avatars bucket > Delete bucket
-- This migration only removes the database column and policies

-- Drop RLS policies for avatars bucket
DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Drop avatar_url column from users table
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;

-- Add comment
COMMENT ON TABLE users IS 'Users table - avatar_url column removed';

-- NOTE: After running this migration, manually delete the 'avatars' bucket from Supabase Dashboard
-- Storage > Buckets > avatars > Delete
