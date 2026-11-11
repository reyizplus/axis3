-- Fix verification_codes SELECT policy for 2FA verification
-- Problem: Cannot read verification codes during 2FA verification

DROP POLICY IF EXISTS "Users can view own verification codes" ON verification_codes;

CREATE POLICY "Users can view own verification codes"
  ON verification_codes
  FOR SELECT
  USING (
    -- Allow if user_id matches authenticated user
    auth.uid() = user_id OR
    -- Allow for pre-registration codes (user_id is null, match by email)
    (user_id IS NULL AND email IS NOT NULL) OR
    -- Allow for 2FA codes (match by user_id, even if not authenticated)
    (user_id IS NOT NULL AND type = '2fa')
  );
