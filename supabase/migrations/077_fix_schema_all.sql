-- ============================================
-- Migration 077: Complete auth schema fixes
-- Fixes: audit_logs.entity_id type,
--        verification_codes missing columns,
--        users missing columns,
--        pending_2fa_sessions missing columns
-- ============================================

-- ============================================
-- 1. AUDIT_LOGS: entity_id UUID → TEXT
--    (rate limiter inserts string keys like "register:user@example.com")
-- ============================================
ALTER TABLE public.audit_logs 
  ALTER COLUMN entity_id TYPE text,
  ALTER COLUMN entity_id SET NOT NULL;

-- ============================================
-- 2. VERIFICATION_CODES: ensure table exists with email column
-- ============================================
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

-- Ensure email column exists (pre-registration flow)
ALTER TABLE verification_codes 
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ALTER COLUMN user_id DROP NOT NULL;

-- Indexes for verification_codes
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email, type, expires_at) WHERE used_at IS NULL;

-- Enable RLS for verification_codes
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can insert own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can update own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can insert verification codes" ON verification_codes;

-- Recreate policies
CREATE POLICY "Users can view own verification codes"
  ON verification_codes FOR SELECT
  USING (auth.uid() = user_id OR email IS NOT NULL);

CREATE POLICY "Users can insert verification codes"
  ON verification_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own verification codes"
  ON verification_codes FOR UPDATE
  USING (auth.uid() = user_id OR email IS NOT NULL);

-- ============================================
-- 3. PENDING_2FA_SESSIONS: ensure table exists with all columns
-- ============================================
CREATE TABLE IF NOT EXISTS pending_2fa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

ALTER TABLE pending_2fa_sessions
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS user_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_pending_2fa_sessions_email ON pending_2fa_sessions(email);
CREATE INDEX IF NOT EXISTS idx_pending_2fa_sessions_expires ON pending_2fa_sessions(expires_at);

ALTER TABLE pending_2fa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage pending 2FA sessions" ON pending_2fa_sessions;
CREATE POLICY "Service role can manage pending 2FA sessions"
  ON pending_2fa_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. USERS: ensure all required columns exist
-- ============================================
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS cookie_consent text CHECK (cookie_consent IN ('accepted', 'declined')),
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Backfill first_name/last_name from full_name
UPDATE public.users
SET 
  first_name = CASE 
    WHEN full_name ~ ' ' THEN SPLIT_PART(full_name, ' ', 1)
    ELSE full_name
  END,
  last_name = CASE 
    WHEN full_name ~ ' ' THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL;

-- Make first_name/last_name NOT NULL after backfill
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'first_name' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN first_name SET NOT NULL;
    ALTER TABLE public.users ALTER COLUMN last_name SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- 5. UPDATE HANDLE_NEW_USER TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  raw_meta jsonb;
  v_first_name text;
  v_last_name text;
  v_full_name text;
BEGIN
  raw_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first_name := NULLIF(TRIM(raw_meta->>'first_name'), '');
  v_last_name := NULLIF(TRIM(raw_meta->>'last_name'), '');
  v_full_name := NULLIF(TRIM(raw_meta->>'full_name'), '');

  IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL AND v_full_name IS NULL THEN
    v_full_name := v_first_name || ' ' || v_last_name;
  END IF;

  IF v_full_name IS NOT NULL AND v_first_name IS NULL AND v_last_name IS NULL THEN
    IF v_full_name ~ ' ' THEN
      v_first_name := SPLIT_PART(v_full_name, ' ', 1);
      v_last_name := SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1);
    ELSE
      v_first_name := v_full_name;
      v_last_name := '';
    END IF;
  END IF;

  IF v_full_name IS NULL THEN
    v_full_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  IF v_first_name IS NULL THEN
    v_first_name := SPLIT_PART(NEW.email, '@', 1);
    v_last_name := '';
  END IF;

  BEGIN
    INSERT INTO public.users (
      id, email, full_name, first_name, last_name,
      phone, company_name, is_corporate, tax_number, tax_office,
      terms_accepted_at, preferences,
      email_verified, email_verified_at,
      two_factor_enabled, two_factor_secret
    )
    VALUES (
      NEW.id, NEW.email,
      v_full_name, v_first_name, v_last_name,
      NULLIF(TRIM(raw_meta->>'phone'), ''),
      NULLIF(TRIM(raw_meta->>'company_name'), ''),
      COALESCE((raw_meta->>'is_corporate')::boolean, false),
      NULLIF(TRIM(raw_meta->>'tax_number'), ''),
      NULLIF(TRIM(raw_meta->>'tax_office'), ''),
      (raw_meta->>'terms_accepted_at')::timestamptz,
      jsonb_build_object(
        'newsletter', COALESCE((raw_meta->>'newsletter_consent')::boolean, false)
      ),
      COALESCE((raw_meta->>'email_verified')::boolean, false),
      NULL,
      false, NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      is_corporate = EXCLUDED.is_corporate,
      tax_number = EXCLUDED.tax_number,
      tax_office = EXCLUDED.tax_office,
      terms_accepted_at = EXCLUDED.terms_accepted_at,
      preferences = EXCLUDED.preferences;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error for %: %', NEW.email, SQLERRM;
  END;

  IF NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.users
    SET email_verified = true,
        email_verified_at = NEW.email_confirmed_at
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
