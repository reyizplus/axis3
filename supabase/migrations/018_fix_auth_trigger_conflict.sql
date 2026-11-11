-- Migration: Fix Auth Trigger Conflict
-- Problem: Migration 016 BEFORE INSERT trigger may be preventing AFTER INSERT trigger
-- Solution: Ensure both triggers work together and add logging

-- First, let's add better logging to the original handle_new_user function
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
    NEW.email_confirmed_at IS NOT NULL,
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

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add a function to manually sync existing users
CREATE OR REPLACE FUNCTION public.sync_existing_auth_users()
RETURNS TABLE(synced_count INTEGER, error_count INTEGER) AS $$
DECLARE
  v_synced INTEGER := 0;
  v_errors INTEGER := 0;
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
        v_user.email_confirmed_at IS NOT NULL,
        'active',
        NOW(),
        NOW()
      );
      
      v_synced := v_synced + 1;
      RAISE LOG 'Synced user: %', v_user.email;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        RAISE LOG 'Error syncing user %: %', v_user.email, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_synced, v_errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_existing_auth_users() TO service_role;

-- Comment
COMMENT ON FUNCTION public.sync_existing_auth_users() IS 
'Manually syncs existing auth.users to public.users. Run this to fix users created before trigger was active.';

-- To execute the sync, run:
-- SELECT * FROM public.sync_existing_auth_users();
