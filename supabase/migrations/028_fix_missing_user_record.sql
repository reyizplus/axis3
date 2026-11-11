-- Fix missing user record in public.users table
-- This user exists in auth.users but not in public.users

DO $$
DECLARE
  auth_user_id UUID;
  auth_user_email TEXT;
BEGIN
  -- Get user from auth.users
  SELECT id, email INTO auth_user_id, auth_user_email
  FROM auth.users
  WHERE email = 'wokavi9905@mugstock.com';

  -- If user exists in auth but not in public.users, insert it
  IF auth_user_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, full_name, two_factor_enabled, email_verified, created_at, updated_at)
    VALUES (
      auth_user_id,
      auth_user_email,
      auth_user_email, -- Use email as full_name temporarily
      true, -- Enable 2FA
      true, -- Mark as verified
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET two_factor_enabled = true,
        updated_at = NOW();
    
    RAISE NOTICE 'User record created/updated for: %', auth_user_email;
  ELSE
    RAISE NOTICE 'User not found in auth.users: wokavi9905@mugstock.com';
  END IF;
END $$;
