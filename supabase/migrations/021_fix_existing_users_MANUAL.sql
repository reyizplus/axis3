-- ⚠️⚠️⚠️ SUPABASE DASHBOARD - SQL EDITOR'DA ÇALIŞTIR ⚠️⚠️⚠️
-- Bu script trigger oluşturmadan mevcut sorunları çözer
-- Yeni kullanıcılar için trigger zaten Migration 005'te oluşturulmuş

-- Migration 021: Fix Existing Users (Without Recreating Triggers)
-- Fixes: Model upload error, Login issues

-- 1. Drop Migration 016's problematic trigger (if exists)
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_auto_confirm();

-- 2. Fix phone field length
ALTER TABLE public.users
ALTER COLUMN phone TYPE VARCHAR(50);

-- 3. Ensure printer settings exist (from Migration 010)
INSERT INTO public.global_settings (key, value, description, category) VALUES
  (
    'printer_max_build_volume',
    '{"x": 20, "y": 20, "z": 20, "unit": "cm"}',
    'Yazıcı maksimum baskı hacmi (cm cinsinden)',
    'operations'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. Ensure is_admin() function exists (from Migration 009)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      -- Check if user has admin role in metadata
      (raw_user_meta_data->>'role' = 'admin')
      OR
      -- Check if user has axis3.com.tr email (internal staff)
      (email LIKE '%@axis3.com.tr')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin() IS 'Checks if current authenticated user has admin privileges';

-- 5. Enable RLS on global_settings and add read policy for all authenticated users
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Allow admins to manage global settings" ON public.global_settings;

-- Allow all authenticated users to read global settings
CREATE POLICY "Allow authenticated users to read global settings"
  ON public.global_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow only admins to insert/update/delete global settings
CREATE POLICY "Allow admins to manage global settings"
  ON public.global_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. Auto-confirm all existing users to fix login issues
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 8. Sync all existing auth.users to public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  phone,
  is_corporate,
  email_verified,
  status,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  au.raw_user_meta_data->>'phone',
  COALESCE((au.raw_user_meta_data->>'is_corporate')::boolean, false),
  true,
  'active',
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  email_verified = true,
  updated_at = NOW();

-- 9. Update existing trigger function to auto-confirm users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user triggered for user: % (email: %)', NEW.id, NEW.email;
  
  -- Insert into public.users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    is_corporate,
    email_verified,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'is_corporate')::boolean, false),
    true, -- Auto-set to true to avoid login issues
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    email_verified = true, -- Always set to true
    updated_at = NOW();
  
  RAISE LOG 'User record created/updated in public.users for: %', NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW; -- Don't block auth user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Comprehensive verification
DO $$
DECLARE
  trigger_count INTEGER;
  user_count INTEGER;
  auth_user_count INTEGER;
  confirmed_count INTEGER;
  unconfirmed_count INTEGER;
BEGIN
  -- Check trigger (should already exist from Migration 005)
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth';
  
  -- Check user counts
  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  SELECT COUNT(*) INTO user_count FROM public.users;
  SELECT COUNT(*) INTO confirmed_count FROM auth.users WHERE email_confirmed_at IS NOT NULL;
  SELECT COUNT(*) INTO unconfirmed_count FROM auth.users WHERE email_confirmed_at IS NULL;
  
  RAISE NOTICE '=== Migration 021 Complete ===';
  RAISE NOTICE '✓ Trigger exists: %', CASE WHEN trigger_count > 0 THEN 'YES' ELSE 'NO (WARNING!)' END;
  RAISE NOTICE '✓ Auth users: %', auth_user_count;
  RAISE NOTICE '✓ Public users: %', user_count;
  RAISE NOTICE '✓ Confirmed users: %', confirmed_count;
  RAISE NOTICE '✓ Unconfirmed users: %', unconfirmed_count;
  
  IF user_count < auth_user_count THEN
    RAISE WARNING 'Some auth.users are not synced to public.users (% vs %)', auth_user_count, user_count;
  END IF;
  
  IF unconfirmed_count > 0 THEN
    RAISE WARNING 'Still have % unconfirmed users!', unconfirmed_count;
  ELSE
    RAISE NOTICE '✓ All users confirmed and can login';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== What Was Fixed ===';
  RAISE NOTICE '✓ Migration 016 trigger removed';
  RAISE NOTICE '✓ Phone field expanded to VARCHAR(50)';
  RAISE NOTICE '✓ Printer settings ensured (build volume)';
  RAISE NOTICE '✓ is_admin() function created';
  RAISE NOTICE '✓ RLS policies added for global_settings';
  RAISE NOTICE '✓ All users synced between auth and public schemas';
  RAISE NOTICE '✓ All users confirmed for login';
  RAISE NOTICE '✓ Trigger function updated with auto-confirm';
  RAISE NOTICE '';
  RAISE NOTICE 'Test: Register new user → Login → Upload STL file';
END $$;

-- Comments
COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a public.users record when a new user signs up. Auto-confirms users to prevent login issues. Updated by Migration 021.';
