-- ============================================
-- AXIS3 - AUTH USER SYNC TRIGGER
-- Version: 1.0
-- Date: 2026-04-17
-- Description: Sync auth.users to public.users automatically
-- ============================================

-- Function: Handle new user registration
-- This function is triggered when a new user is created in auth.users
-- It automatically creates a corresponding record in public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'is_corporate')::boolean, false),
    NEW.email_confirmed_at IS NOT NULL,
    'active',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On auth user created
-- Executes handle_new_user() function after insert on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function: Handle user email verification
-- Updates email_verified status when user confirms email
CREATE OR REPLACE FUNCTION public.handle_user_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users
    SET 
      email_verified = true,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On auth user email verified
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
CREATE TRIGGER on_auth_user_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_verified();

-- Function: Handle user deletion
-- Soft delete user in public.users when auth.users record is deleted
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET 
    status = 'deleted',
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On auth user deleted
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deletion();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a public.users record when a new user signs up via Supabase Auth';
COMMENT ON FUNCTION public.handle_user_email_verified() IS 'Updates email_verified status in public.users when user confirms email';
COMMENT ON FUNCTION public.handle_user_deletion() IS 'Soft deletes user in public.users when auth.users record is deleted';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test if triggers are created
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' OR event_object_schema = 'auth';

-- Test user sync (after creating a test user)
-- SELECT u.id, u.email, u.full_name, au.email as auth_email
-- FROM public.users u
-- JOIN auth.users au ON u.id = au.id;
