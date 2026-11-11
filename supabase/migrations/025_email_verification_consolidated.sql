-- ============================================
-- AXIS3 - EMAIL VERIFICATION & REGISTRATION FLOW
-- Version: 2.0 (Consolidated)
-- Date: 2026-04-22
-- Description: Complete email verification system with pre-registration flow
-- ============================================

-- ============================================
-- PART 1: EMAIL VERIFICATION SYSTEM (from 023)
-- ============================================

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  code VARCHAR(6) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'email_verification',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add email_verified columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Add 2FA columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email, type, expires_at) WHERE used_at IS NULL;

-- Composite index for verification lookup optimization
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup 
ON verification_codes(user_id, code, type, expires_at) 
WHERE used_at IS NULL;

-- ============================================
-- PART 2: RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
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
-- PART 3: CLEANUP FUNCTION
-- ============================================

-- Function to clean up expired codes (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- ============================================
-- PART 4: COMMENTS
-- ============================================

COMMENT ON TABLE verification_codes IS 'Email verification codes (6-digit) for registration and 2FA';
COMMENT ON COLUMN verification_codes.type IS 'Verification type: registration (pre-signup), email_verification (post-signup), password_reset';
COMMENT ON COLUMN verification_codes.email IS 'Email address for pre-registration verification (when user_id is null)';
COMMENT ON COLUMN verification_codes.attempts IS 'Failed verification attempts (max 3)';
COMMENT ON COLUMN users.email_verified IS 'Email verification status';
COMMENT ON COLUMN users.email_verified_at IS 'Email verification timestamp';
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for 2FA (encrypted)';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'verification_codes';

-- Test pre-registration code
-- SELECT * FROM verification_codes 
-- WHERE email = 'test@example.com' 
-- AND type = 'registration' 
-- AND used_at IS NULL;

-- Test 2FA status
-- SELECT id, email, two_factor_enabled 
-- FROM users 
-- WHERE email = 'test@example.com';
