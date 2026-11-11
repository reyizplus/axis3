-- ============================================
-- MIGRATION 085: FIX USER/FILE DELETE CONSTRAINTS
-- Date: 2026-06-23
-- Description:
--   - Fix orders FK to allow SET NULL on user delete
--   - Add admin DELETE policy for files table
--   - Update admin_delete_user_complete to handle orders + missing tables
-- ============================================

-- 1. Fix orders FK constraint: allow SET NULL when user is deleted
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Add admin DELETE policy for files (admin was using user client which hits RLS)
DROP POLICY IF EXISTS "Admins can delete all files" ON files;
CREATE POLICY "Admins can delete all files"
ON files FOR DELETE
USING (public.is_admin());

-- 3. Update admin_delete_user_complete to handle orders + missing tables
CREATE OR REPLACE FUNCTION admin_delete_user_complete(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  v_file_count INTEGER;
  v_order_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_file_count FROM files WHERE user_id = user_uuid AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_order_count FROM orders WHERE user_id = user_uuid;

  -- 1. Delete cart (cart_items cascade)
  DELETE FROM carts WHERE user_id = user_uuid;

  -- 2. Delete store cart items
  DELETE FROM store_cart_items WHERE user_id = user_uuid;

  -- 3. Delete notification preferences
  DELETE FROM notification_preferences WHERE user_id = user_uuid;

  -- 4. Soft-delete files
  UPDATE files SET deleted_at = NOW(), updated_at = NOW()
  WHERE user_id = user_uuid AND deleted_at IS NULL;

  -- 5. Delete user activity logs
  DELETE FROM user_activity_logs WHERE user_id = user_uuid;

  -- 6. Nullify audit logs
  UPDATE audit_logs SET user_id = NULL WHERE user_id = user_uuid;

  -- 7. Delete feedback
  DELETE FROM feedback WHERE user_id = user_uuid;

  -- 8. Delete password reset tokens
  DELETE FROM password_reset_tokens WHERE user_id = user_uuid;

  -- 9. Delete verification codes
  DELETE FROM verification_codes WHERE user_id = user_uuid;

  -- 10. Delete pending 2FA sessions
  DELETE FROM pending_2fa_sessions WHERE user_id = user_uuid;

  -- 11. Delete corporate pricing rules
  DELETE FROM corporate_pricing_rules WHERE user_id = user_uuid;

  -- 12. Nullify guest session conversion reference
  UPDATE guest_sessions SET converted_to_user_id = NULL WHERE converted_to_user_id = user_uuid;

  -- 13. Nullify orders (FK allows SET NULL)
  UPDATE orders SET user_id = NULL WHERE user_id = user_uuid;

  -- 14. Delete the user profile (cascades to addresses)
  DELETE FROM users WHERE id = user_uuid;

  result := jsonb_build_object(
    'success', true,
    'files_affected', v_file_count,
    'orders_affected', v_order_count,
    'user_id', user_uuid
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
