-- Fix verification_codes INSERT policy for 2FA
-- Problem: 2FA codes cannot be inserted because user is not authenticated yet

DROP POLICY IF EXISTS "Users can insert verification codes" ON verification_codes;

CREATE POLICY "Users can insert verification codes"
  ON verification_codes
  FOR INSERT
  WITH CHECK (
    -- Allow if user_id is null (pre-registration)
    user_id IS NULL OR
    -- Allow if user_id matches authenticated user (post-login)
    auth.uid() = user_id OR
    -- Allow for 2FA codes (user exists but not authenticated yet)
    (user_id IS NOT NULL AND type = '2fa')
  );
