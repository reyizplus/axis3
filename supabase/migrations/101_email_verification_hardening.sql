-- ============================================
-- 101: Email / 2FA verification hardening
-- ============================================
-- Fixes:
--   1. verification_codes was readable/updatable/deletable by ANY client
--      (policy predicate was `email IS NOT NULL`, which matches every row).
--      All 6-digit registration and 2FA codes were therefore public.
--   2. Codes were stored in plaintext.
--   3. Legacy code type `2fa` (old migrations) vs `2fa_email` (app) mismatch.
--
-- After this migration the table is server-only: every read/write goes
-- through the service-role client in src/lib/auth/actions/*.

-- ------------------------------------------------------------
-- 1. Hashed codes
-- ------------------------------------------------------------
ALTER TABLE verification_codes
  ADD COLUMN IF NOT EXISTS code_hash TEXT;

-- Codes are stored as `hmac-sha256:<hex>` in code_hash; the legacy plaintext
-- `code` column is no longer written by the application.
ALTER TABLE verification_codes
  ALTER COLUMN code DROP NOT NULL;

COMMENT ON COLUMN verification_codes.code IS
  'Legacy plaintext code. Unused since migration 101; only kept for schema compatibility.';
COMMENT ON COLUMN verification_codes.code_hash IS
  'HMAC-SHA256 of "<email>:<code>" prefixed with hmac-sha256:. Never store plaintext codes.';

-- Any code created before this migration is plaintext and must be considered
-- compromised. Invalidate (do not delete) so audit history survives.
UPDATE verification_codes
SET used_at = NOW()
WHERE code_hash IS NULL
  AND used_at IS NULL;

-- Old migrations used type = '2fa'; the application writes '2fa_email'.
UPDATE verification_codes
SET type = '2fa_email'
WHERE type = '2fa';

-- Cleanup indexes used by expiry jobs and per-user lookups.
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_active
  ON verification_codes(email, type, expires_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_active
  ON verification_codes(user_id, type, expires_at)
  WHERE used_at IS NULL;

-- ------------------------------------------------------------
-- 2. Lock the table down
-- ------------------------------------------------------------
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop every policy that ever existed on this table. Verification codes are
-- never read or written from the browser, so no client policy should remain.
DROP POLICY IF EXISTS "Users can view own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can insert own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can update own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can insert verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can delete own verification codes" ON verification_codes;

-- Belt and braces: even if a policy is re-added by hand later, the API roles
-- cannot touch the table at all.
REVOKE ALL ON TABLE verification_codes FROM anon, authenticated;
GRANT ALL ON TABLE verification_codes TO service_role;
