-- ============================================
-- AXIS3 - REGISTRATION FLOW UPDATE
-- Version: 1.0
-- Date: 2026-04-22
-- Description: Update verification system for pre-registration email verification
-- ============================================

-- Add email column for pre-registration verification
ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Make user_id nullable (for pre-registration codes)
ALTER TABLE verification_codes 
ALTER COLUMN user_id DROP NOT NULL;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email 
ON verification_codes(email, type, expires_at) 
WHERE used_at IS NULL;

-- Add 2FA columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Update type comment
COMMENT ON COLUMN verification_codes.type IS 'Verification type: registration (pre-signup), email_verification (post-signup), password_reset';
COMMENT ON COLUMN verification_codes.email IS 'Email address for pre-registration verification (when user_id is null)';
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for 2FA (encrypted)';

-- Update RLS policies to allow email-based access
DROP POLICY IF EXISTS "Users can view own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can insert own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can update own verification codes" ON verification_codes;

-- New RLS policies supporting both user_id and email
CREATE POLICY "Users can view own verification codes"
  ON verification_codes
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    email IS NOT NULL
  );

CREATE POLICY "Users can insert verification codes"
  ON verification_codes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL
  );

CREATE POLICY "Users can update own verification codes"
  ON verification_codes
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    email IS NOT NULL
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test pre-registration code
-- SELECT * FROM verification_codes 
-- WHERE email = 'test@example.com' 
-- AND type = 'registration' 
-- AND used_at IS NULL;

-- Test 2FA status
-- SELECT id, email, two_factor_enabled 
-- FROM users 
-- WHERE email = 'test@example.com';
