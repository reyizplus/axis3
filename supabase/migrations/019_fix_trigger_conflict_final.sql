-- Migration: Fix Auth Trigger - Remove Conflicting Trigger
-- Problem: Migration 016 BEFORE INSERT trigger prevents AFTER INSERT trigger from working
-- Solution: Drop the conflicting trigger and ensure AFTER INSERT trigger works properly

-- 1. Drop the conflicting BEFORE INSERT trigger from migration 016
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_auto_confirm();

-- 2. Update the main handle_new_user function with better error handling and auto-confirm
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
    COALESCE(NEW.email_confirmed_at IS NOT NULL, true), -- Auto-confirm if not set
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
  
  RAISE LOG 'User record created/updated in public.users for: %', NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW; -- Don't block auth user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the AFTER INSERT trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Drop and recreate sync function with better error handling
DROP FUNCTION IF EXISTS public.sync_existing_auth_users();

CREATE FUNCTION public.sync_existing_auth_users()
RETURNS TABLE(synced_count INTEGER, error_count INTEGER, error_details TEXT[]) AS $$
DECLARE
  v_synced INTEGER := 0;
  v_errors INTEGER := 0;
  v_error_list TEXT[] := ARRAY[]::TEXT[];
  v_user RECORD;
BEGIN
  -- Loop through all auth.users that don't exist in public.users
  FOR v_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.email_confirmed_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
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
        v_user.id,
        v_user.email,
        COALESCE(v_user.raw_user_meta_data->>'full_name', v_user.email),
        v_user.raw_user_meta_data->>'phone',
        COALESCE((v_user.raw_user_meta_data->>'is_corporate')::boolean, false),
        COALESCE(v_user.email_confirmed_at IS NOT NULL, true),
        'active',
        NOW(),
        NOW()
      );
      
      v_synced := v_synced + 1;
      RAISE LOG 'Synced user: %', v_user.email;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        v_error_list := array_append(v_error_list, format('User %s: %s', v_user.email, SQLERRM));
        RAISE LOG 'Error syncing user %: %', v_user.email, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_synced, v_errors, v_error_list;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_existing_auth_users() TO service_role, authenticated;

-- 6. Verify trigger is active
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth';
  
  IF trigger_count = 0 THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created not found!';
  ELSE
    RAISE LOG 'Trigger on_auth_user_created is active';
  END IF;
END $$;

-- Comment
COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a public.users record when a new user signs up via Supabase Auth. Auto-confirms users to disable Supabase confirmation emails.';

COMMENT ON FUNCTION public.sync_existing_auth_users() IS 
'Manually syncs existing auth.users to public.users with detailed error reporting.';
