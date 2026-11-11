-- ============================================
-- MIGRATION 058: FIX 2FA PERSISTENCE AND PROFILE NAME DISPLAY
-- Date: 2026-04-24
-- Description: 2FA logout sonrası kapanma ve profil isim görünmeme sorunlarını çöz
-- ============================================

-- ============================================
-- 1. PENDING_2FA_SESSIONS TABLE ENHANCEMENT
-- ============================================

-- Add two_factor_enabled column to preserve 2FA state
ALTER TABLE pending_2fa_sessions
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT TRUE;

-- Add user_metadata column to preserve user info during 2FA flow
ALTER TABLE pending_2fa_sessions
ADD COLUMN IF NOT EXISTS user_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN pending_2fa_sessions.two_factor_enabled IS '2FA state preservation during login flow';
COMMENT ON COLUMN pending_2fa_sessions.user_metadata IS 'User metadata (full_name, etc.) preserved during 2FA';

-- ============================================
-- 2. HANDLE_NEW_USER TRIGGER ENHANCEMENT
-- ============================================

-- Improved trigger function with better full_name fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RAISE LOG 'Auth trigger fired for user: % (email: %)', NEW.id, NEW.email;
  
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    is_corporate,
    email_verified,
    two_factor_enabled,
    status,
    notification_preferences,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Enhanced full_name fallback chain
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1), -- Use email username as fallback
      'Kullanıcı'
    ),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'is_corporate')::boolean, false),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, true),
    COALESCE((NEW.raw_user_meta_data->>'two_factor_enabled')::boolean, false),
    'active',
    '{"email_order_updates": true, "email_marketing": false, "email_newsletter": false}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(
      EXCLUDED.full_name,
      public.users.full_name,
      split_part(EXCLUDED.email, '@', 1)
    ),
    email_verified = EXCLUDED.email_verified,
    -- CRITICAL: Preserve two_factor_enabled on conflict
    two_factor_enabled = COALESCE(public.users.two_factor_enabled, EXCLUDED.two_factor_enabled),
    notification_preferences = COALESCE(public.users.notification_preferences, EXCLUDED.notification_preferences),
    updated_at = NOW();
  
  RAISE LOG 'User record created/updated: % (full_name: %)', NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'ERROR in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. SYNC EXISTING USERS - FIX MISSING NAMES
-- ============================================

-- Update users with NULL or empty full_name
UPDATE public.users
SET full_name = split_part(email, '@', 1),
    updated_at = NOW()
WHERE full_name IS NULL 
   OR full_name = '' 
   OR full_name = email;

-- ============================================
-- 4. HELPER FUNCTION: GET USER WITH 2FA STATUS
-- ============================================

-- Function to safely get user with 2FA status (used in auth flow)
CREATE OR REPLACE FUNCTION public.get_user_2fa_status(user_email TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  two_factor_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(u.full_name, split_part(u.email, '@', 1)) as full_name,
    COALESCE(u.two_factor_enabled, false) as two_factor_enabled
  FROM public.users u
  WHERE u.email = user_email
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_2fa_status(TEXT) TO authenticated, anon;

-- ============================================
-- 5. CLEANUP FUNCTION FOR EXPIRED 2FA SESSIONS
-- ============================================

-- Enhanced cleanup function
CREATE OR REPLACE FUNCTION delete_expired_pending_2fa_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_2fa_sessions
  WHERE expires_at < NOW() OR used = TRUE;
  
  RAISE LOG 'Cleaned up expired 2FA sessions';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

-- Check users with missing names
SELECT 
  COUNT(*) as users_with_missing_names
FROM public.users
WHERE full_name IS NULL OR full_name = '' OR full_name = email;

-- Check 2FA enabled users
SELECT 
  COUNT(*) as users_with_2fa_enabled
FROM public.users
WHERE two_factor_enabled = true;

-- Check pending 2FA sessions structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pending_2fa_sessions'
ORDER BY ordinal_position;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Changes:
-- 1. Added two_factor_enabled and user_metadata to pending_2fa_sessions
-- 2. Enhanced handle_new_user() with better full_name fallback
-- 3. Fixed existing users with missing names
-- 4. Added get_user_2fa_status() helper function
-- 5. Enhanced cleanup function
-- ============================================
