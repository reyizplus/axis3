-- ============================================
-- MIGRATION 043: NOTIFICATION PREFERENCES
-- Date: 2026-04-23
-- Description: Add notification preferences JSONB field
-- ============================================

-- Add notification_preferences column with default values
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_order_updates": true,
  "email_marketing": false,
  "email_newsletter": false
}'::jsonb;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN users.notification_preferences IS 'User notification preferences (email_order_updates, email_marketing, email_newsletter)';
