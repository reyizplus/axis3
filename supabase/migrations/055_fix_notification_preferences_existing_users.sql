-- ============================================
-- MIGRATION 055: FIX NOTIFICATION PREFERENCES FOR EXISTING USERS
-- Date: 2026-04-23
-- Description: Update existing users with NULL notification_preferences
-- ============================================

-- Update all users with NULL notification_preferences to default values
UPDATE users
SET notification_preferences = '{
  "email_order_updates": true,
  "email_marketing": false,
  "email_newsletter": false
}'::jsonb,
    updated_at = NOW()
WHERE notification_preferences IS NULL;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- SELECT 
--   COUNT(*) as total_users,
--   COUNT(notification_preferences) as users_with_preferences,
--   COUNT(*) - COUNT(notification_preferences) as users_without_preferences
-- FROM users;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN users.notification_preferences IS 'User notification preferences - automatically initialized with defaults for all users';
