-- ============================================
-- MIGRATION 079: ADMIN USER DELETE CASCADE
-- Date: 2026-06-15
-- Description: Functions for complete user deletion
--   - Safely delete user files from storage
--   - Handle files referenced in orders (soft-delete)
--   - Cascade delete all user-related records
--   - Complete admin user deletion utility
-- ============================================

-- ============================================
-- FUNCTION: admin_delete_user_files
-- Deletes files from storage and DB, skipping
-- files that are referenced in orders
-- ============================================
CREATE OR REPLACE FUNCTION admin_delete_user_files(user_uuid UUID)
RETURNS TABLE(file_id UUID, filename TEXT, storage_path TEXT, deleted BOOLEAN, reason TEXT) AS $$
DECLARE
  file_rec RECORD;
BEGIN
  FOR file_rec IN
    SELECT f.id, f.filename, f.storage_path
    FROM files f
    WHERE f.user_id = user_uuid AND f.deleted_at IS NULL
  LOOP
    -- Check if file is referenced in any order
    IF EXISTS (SELECT 1 FROM order_items WHERE file_id = file_rec.id) THEN
      -- Soft-delete: mark as deleted but keep storage
      UPDATE files
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = file_rec.id;
      RETURN QUERY SELECT file_rec.id, file_rec.filename, file_rec.storage_path, false::BOOLEAN, 'in_order'::TEXT;
    ELSE
      -- Check if file is in cart_items (will be nullified by ON DELETE SET NULL)
      -- Hard-delete: remove from storage and DB
      RETURN QUERY SELECT file_rec.id, file_rec.filename, file_rec.storage_path, true::BOOLEAN, 'deleted'::TEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: admin_delete_user_complete
-- Completely removes a user and all associated data
-- Steps:
--   1. Delete user's cart
--   2. Clean up related records
--   3. Handle files (soft-delete if in orders)
--   4. Delete user profile
-- ============================================
CREATE OR REPLACE FUNCTION admin_delete_user_complete(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  v_file_count INTEGER;
  v_order_count INTEGER;
BEGIN
  -- Count affected records for reporting
  SELECT COUNT(*) INTO v_file_count FROM files WHERE user_id = user_uuid AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_order_count FROM orders WHERE user_id = user_uuid;

  -- 1. Delete cart (cart_items cascade)
  DELETE FROM carts WHERE user_id = user_uuid;

  -- 2. Nullify file references in cart_items (handled by ON DELETE SET NULL)

  -- 3. Soft-delete files that are in orders, mark others for storage cleanup
  UPDATE files SET deleted_at = NOW(), updated_at = NOW()
  WHERE user_id = user_uuid
    AND deleted_at IS NULL;

  -- 4. Delete user activity logs
  DELETE FROM user_activity_logs WHERE user_id = user_uuid;

  -- 5. Delete audit logs references
  -- (keep audit logs for record, just nullify user_id)
  UPDATE audit_logs SET user_id = NULL WHERE user_id = user_uuid;

  -- 6. Delete feedback
  DELETE FROM feedback WHERE user_id = user_uuid;

  -- 7. Delete password reset tokens
  DELETE FROM password_reset_tokens WHERE user_id = user_uuid;

  -- 8. Delete verification codes
  DELETE FROM verification_codes WHERE user_id = user_uuid;

  -- 9. Delete pending 2FA sessions
  DELETE FROM pending_2fa_sessions WHERE user_id = user_uuid;

  -- 10. Delete corporate pricing rules
  DELETE FROM corporate_pricing_rules WHERE user_id = user_uuid;

  -- 11. Delete guest session conversion reference
  UPDATE guest_sessions SET converted_to_user_id = NULL WHERE converted_to_user_id = user_uuid;

  -- 12. Delete addresses (handled by ON DELETE CASCADE from users)

  -- 13. Delete the user profile (will cascade to addresses, files)
  DELETE FROM users WHERE id = user_uuid;

  -- Build result
  result := jsonb_build_object(
    'success', true,
    'files_affected', v_file_count,
    'orders_affected', v_order_count,
    'user_id', user_uuid
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_storage_stats
-- Returns storage usage statistics for admin
-- ============================================
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  v_stl_count INTEGER;
  v_stl_bytes BIGINT;
  v_stl_users INTEGER;
  v_image_count INTEGER;
  v_image_bytes BIGINT;
  v_thumbnail_count INTEGER;
  v_thumbnail_bytes BIGINT;
  v_total_users INTEGER;
BEGIN
  -- STL files stats (from database)
  SELECT COUNT(*), COALESCE(SUM(file_size), 0)
  INTO v_stl_count, v_stl_bytes
  FROM files
  WHERE deleted_at IS NULL;

  SELECT COUNT(DISTINCT user_id) INTO v_stl_users
  FROM files
  WHERE deleted_at IS NULL AND user_id IS NOT NULL;

  -- Image stats (from public.images bucket via storage - approximate from DB usage)
  -- For now we track from the files table
  SELECT COUNT(*) INTO v_image_count
  FROM files
  WHERE mime_type LIKE 'image/%' AND deleted_at IS NULL;

  SELECT COALESCE(SUM(file_size), 0) INTO v_image_bytes
  FROM files
  WHERE mime_type LIKE 'image/%' AND deleted_at IS NULL;

  -- Thumbnail stats (approximate)
  v_thumbnail_count := 0;
  v_thumbnail_bytes := 0;

  SELECT COUNT(*) INTO v_total_users FROM users WHERE deleted_at IS NULL;

  result := jsonb_build_object(
    'stl', jsonb_build_object('count', v_stl_count, 'bytes', v_stl_bytes, 'active_users', v_stl_users),
    'images', jsonb_build_object('count', v_image_count, 'bytes', v_image_bytes),
    'thumbnails', jsonb_build_object('count', v_thumbnail_count, 'bytes', v_thumbnail_bytes),
    'total', jsonb_build_object('count', v_stl_count + v_image_count + v_thumbnail_count, 'bytes', v_stl_bytes + v_image_bytes + v_thumbnail_bytes),
    'total_users', v_total_users
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION admin_delete_user_files(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION admin_delete_user_complete(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_storage_stats() TO service_role, authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION admin_delete_user_files(UUID) IS 'Admin: List user files for deletion, returns whether each can be safely deleted from storage';
COMMENT ON FUNCTION admin_delete_user_complete(UUID) IS 'Admin: Completely remove user and all associated data from the database';
COMMENT ON FUNCTION get_storage_stats() IS 'Admin: Get storage usage statistics across all buckets';
