-- ============================================
-- AXIS3 - ADD MISSING COLUMNS ONLY
-- Version: 1.0
-- Date: 2026-04-22
-- Description: Add only missing columns to existing tables
-- ============================================

-- Add missing columns to verification_codes
ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

-- Make user_id nullable
ALTER TABLE verification_codes 
ALTER COLUMN user_id DROP NOT NULL;

-- Add missing columns to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_verification_codes_email 
ON verification_codes(email, type, expires_at) 
WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup 
ON verification_codes(user_id, code, type, expires_at) 
WHERE used_at IS NULL;

-- Update comments
COMMENT ON COLUMN verification_codes.email IS 'Email address for pre-registration verification (when user_id is null)';
COMMENT ON COLUMN verification_codes.attempts IS 'Failed verification attempts (max 3)';
COMMENT ON COLUMN users.email_verified_at IS 'Email verification timestamp';
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for 2FA (encrypted)';
