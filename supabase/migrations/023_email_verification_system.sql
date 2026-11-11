-- Email Verification System
-- Migration: 023_email_verification_system.sql
-- Description: Add email verification with 6-digit code

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'email_verification', -- email_verification, password_reset
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0, -- Track failed verification attempts
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add email_verified column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Composite index for verification lookup optimization
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup
ON verification_codes(user_id, code, type, expires_at)
WHERE used_at IS NULL;

-- RLS Policies
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own verification codes
CREATE POLICY "Users can view own verification codes"
  ON verification_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own verification codes
CREATE POLICY "Users can insert own verification codes"
  ON verification_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own verification codes
CREATE POLICY "Users can update own verification codes"
  ON verification_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

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

-- Comment
COMMENT ON TABLE verification_codes IS 'Email verification codes (6-digit)';
COMMENT ON COLUMN users.email_verified IS 'Email verification status';
COMMENT ON COLUMN users.email_verified_at IS 'Email verification timestamp';
