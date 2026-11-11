-- ============================================
-- AXIS3 - DEBUG FEEDBACK POLICIES
-- Version: 1.0
-- Date: 2026-04-23
-- Description: Check and fix feedback table RLS policies
-- ============================================

-- Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'feedback'
ORDER BY policyname;

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'feedback'
ORDER BY ordinal_position;

-- ============================================
-- FIX: Ensure anonymous contact form policy exists
-- ============================================

-- Drop and recreate the policy to ensure it's correct
DROP POLICY IF EXISTS "Anyone can create contact form feedback" ON feedback;

CREATE POLICY "Anyone can create contact form feedback"
ON feedback FOR INSERT
TO anon, authenticated
WITH CHECK (
    category = 'support' 
    AND user_id IS NULL 
    AND contact_name IS NOT NULL 
    AND contact_email IS NOT NULL
);

-- Verify the policy was created
SELECT 
    policyname,
    roles,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'feedback' 
AND policyname = 'Anyone can create contact form feedback';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
