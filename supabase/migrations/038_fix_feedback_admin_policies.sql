-- ============================================
-- AXIS3 - FIX FEEDBACK ADMIN POLICIES
-- Version: 1.0
-- Date: 2026-04-22
-- Description: Add missing admin policies for feedback system
-- ============================================

-- Drop existing user update policy (too restrictive)
DROP POLICY IF EXISTS "Users can update own pending feedback" ON feedback;

-- Recreate with correct logic
CREATE POLICY "Users can update own pending feedback"
ON feedback FOR UPDATE
USING (auth.uid() = user_id AND status = 'new');

-- Add admin policies
CREATE POLICY "Admins can view all feedback"
ON feedback FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can update all feedback"
ON feedback FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete feedback"
ON feedback FOR DELETE
USING (is_admin());

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- RLS Policies Added: 3 admin policies
-- Total Policies: 6 (3 user + 3 admin)
-- ============================================
