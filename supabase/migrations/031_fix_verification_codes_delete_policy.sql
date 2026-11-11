-- Add DELETE policy for verification_codes
-- Needed to delete old 2FA codes before inserting new ones

CREATE POLICY "Users can delete own verification codes"
  ON verification_codes
  FOR DELETE
  USING (
    -- Allow if user_id matches (for authenticated users)
    auth.uid() = user_id OR
    -- Allow for 2FA codes (user exists but not authenticated yet)
    (user_id IS NOT NULL AND type = '2fa') OR
    -- Allow for pre-registration codes (user_id is null)
    user_id IS NULL
  );

-- Alternative: Drop the unique constraint if it exists
-- This allows multiple active codes per user/type combination
ALTER TABLE verification_codes 
DROP CONSTRAINT IF EXISTS verification_codes_user_id_type_key;
