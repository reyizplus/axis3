-- ============================================
-- AXIS3 - LIST ALL FEEDBACK POLICIES
-- Version: 1.0
-- Date: 2026-04-23
-- Description: Comprehensive check of feedback table policies
-- ============================================

-- 1. Check ALL policies on feedback table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_clause,
    with_check AS with_check_clause
FROM pg_policies 
WHERE tablename = 'feedback'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'feedback';

-- 3. Check table structure for required columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'feedback'
AND column_name IN ('user_id', 'category', 'contact_name', 'contact_email', 'contact_phone')
ORDER BY ordinal_position;

-- 4. Test if anonymous role can see the policy
SELECT 
    has_table_privilege('anon', 'feedback', 'INSERT') AS anon_can_insert,
    has_table_privilege('authenticated', 'feedback', 'INSERT') AS authenticated_can_insert;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- Should see "Anyone can create contact form feedback" policy
-- with roles = {anon,authenticated}
-- and cmd = INSERT
-- ============================================
