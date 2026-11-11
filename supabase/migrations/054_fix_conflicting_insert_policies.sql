-- ============================================
-- AXIS3 - FIX CONFLICTING FEEDBACK POLICIES
-- Version: 1.0
-- Date: 2026-04-23
-- Description: Fix conflicting INSERT policies on feedback table
-- ============================================

-- Problem: Two INSERT policies are conflicting
-- 1. "Users can create feedback" checks: auth.uid() = user_id
-- 2. "Anyone can create contact form feedback" checks: user_id IS NULL
-- When user_id IS NULL, first policy fails because auth.uid() != NULL

-- Solution: Make "Users can create feedback" policy more specific
-- It should only apply when user_id IS NOT NULL

-- Drop the conflicting policy
DROP POLICY IF EXISTS "Users can create feedback" ON feedback;

-- Recreate with proper condition
CREATE POLICY "Users can create feedback"
ON feedback FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id 
    AND user_id IS NOT NULL
);

-- Verify policies
SELECT 
    policyname,
    roles,
    cmd,
    with_check AS with_check_clause
FROM pg_policies 
WHERE tablename = 'feedback'
AND cmd = 'INSERT'
ORDER BY policyname;

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- Now we have two non-conflicting INSERT policies:
-- 1. "Anyone can create contact form feedback" - for anonymous (user_id IS NULL)
-- 2. "Users can create feedback" - for authenticated (user_id IS NOT NULL)
-- ============================================
