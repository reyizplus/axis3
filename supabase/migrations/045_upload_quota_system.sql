-- ============================================
-- MIGRATION 045: UPLOAD QUOTA SYSTEM
-- Date: 2026-04-23
-- Description: Model upload quota system with gamification
-- Rules:
--   - Base quota: 3 models
--   - Per order bonus: +3 models
--   - Soft deleted files don't count
--   - Hard limit: 100 models (abuse prevention)
-- ============================================

-- Add quota columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_quota_bonus INTEGER DEFAULT 0;

-- ============================================
-- FUNCTION: Calculate used quota
-- ============================================
CREATE OR REPLACE FUNCTION calculate_upload_quota_used(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM files
    WHERE user_id = user_uuid
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Calculate total quota
-- ============================================
CREATE OR REPLACE FUNCTION calculate_total_quota(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  base_quota INTEGER := 3;
  order_count INTEGER;
  bonus_quota INTEGER;
  total INTEGER;
BEGIN
  -- Count completed orders (payment_received, preparing, printing, shipped, delivered)
  SELECT COUNT(*)::INTEGER INTO order_count
  FROM orders
  WHERE user_id = user_uuid
  AND status IN ('payment_received', 'preparing', 'printing', 'quality_check', 'packaging', 'shipped', 'delivered');
  
  -- Get bonus quota (admin can manually add bonus)
  SELECT COALESCE(upload_quota_bonus, 0) INTO bonus_quota
  FROM users
  WHERE id = user_uuid;
  
  -- Calculate total
  total := base_quota + (order_count * 3) + bonus_quota;
  
  -- Hard limit: 100 models
  IF total > 100 THEN
    total := 100;
  END IF;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check if user can upload
-- ============================================
CREATE OR REPLACE FUNCTION can_user_upload(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  used_quota INTEGER;
  total_quota INTEGER;
BEGIN
  used_quota := calculate_upload_quota_used(user_uuid);
  total_quota := calculate_total_quota(user_uuid);
  
  RETURN used_quota < total_quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION calculate_upload_quota_used(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_total_quota(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_upload(UUID) TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN users.upload_quota_bonus IS 'Admin-granted bonus quota (default: 0)';
COMMENT ON FUNCTION calculate_upload_quota_used(UUID) IS 'Calculate number of active (non-deleted) files for user';
COMMENT ON FUNCTION calculate_total_quota(UUID) IS 'Calculate total upload quota: 3 base + (orders * 3) + bonus';
COMMENT ON FUNCTION can_user_upload(UUID) IS 'Check if user has remaining upload quota';
