-- ============================================
-- AXIS3 - CONTACT FORM SUPPORT
-- Version: 1.0
-- Date: 2026-04-22
-- Description: Add support for public contact form via feedback system
-- ============================================

-- Add columns for anonymous contact submissions
ALTER TABLE feedback ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- Add index for contact form queries
CREATE INDEX IF NOT EXISTS idx_feedback_contact_email ON feedback(contact_email) WHERE contact_email IS NOT NULL;

-- Add RLS policy for anonymous contact form submissions
CREATE POLICY "Anyone can create contact form feedback"
ON feedback FOR INSERT
WITH CHECK (
    category = 'support' 
    AND user_id IS NULL 
    AND contact_name IS NOT NULL 
    AND contact_email IS NOT NULL
);

-- Add RLS policy for viewing own contact submissions (by email)
CREATE POLICY "Users can view own contact submissions by email"
ON feedback FOR SELECT
USING (
    contact_email IS NOT NULL 
    AND contact_email = current_setting('request.jwt.claims', true)::json->>'email'
);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN feedback.contact_name IS 'Name for anonymous contact form submissions';
COMMENT ON COLUMN feedback.contact_email IS 'Email for anonymous contact form submissions';
COMMENT ON COLUMN feedback.contact_phone IS 'Phone for anonymous contact form submissions';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Columns Added: 3 (contact_name, contact_email, contact_phone)
-- Indexes Created: 1
-- RLS Policies Added: 2
-- Total Feedback Policies: 8 (6 existing + 2 new)
-- ============================================
