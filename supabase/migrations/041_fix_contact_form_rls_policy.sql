-- ============================================
-- AXIS3 - CONTACT FORM RLS POLICY FIX
-- Version: 1.1
-- Date: 2026-04-23
-- Description: Fix RLS policy for anonymous contact form submissions
-- ============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Anyone can create contact form feedback" ON feedback;

-- Create new policy with correct permissions
CREATE POLICY "Anyone can create contact form feedback"
ON feedback FOR INSERT
TO anon, authenticated
WITH CHECK (
    category = 'support' 
    AND user_id IS NULL 
    AND contact_name IS NOT NULL 
    AND contact_email IS NOT NULL
);

-- Verify policy was created
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
AND policyname = 'Anyone can create contact form feedback';

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 1. TO anon, authenticated: Allows both anonymous and logged-in users
-- 2. user_id IS NULL: Ensures this is an anonymous submission
-- 3. contact_name/email NOT NULL: Validates required contact info
-- ============================================
