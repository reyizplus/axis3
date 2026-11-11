-- ============================================
-- MIGRATION 057: FIX AUTH TRIGGER - SIMPLIFIED
-- Date: 2026-04-23
-- Description: Auth trigger düzeltmesi - permissions safe
-- ============================================

-- NOT: Bu migration'ı Supabase Dashboard'da postgres user olarak çalıştırın

-- 1. Trigger fonksiyonunu güncelle (notification_preferences ekle)
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
    status,
    notification_preferences,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'is_corporate')::boolean, false),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, true),
    'active',
    '{"email_order_updates": true, "email_marketing": false, "email_newsletter": false}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    email_verified = EXCLUDED.email_verified,
    notification_preferences = COALESCE(public.users.notification_preferences, EXCLUDED.notification_preferences),
    updated_at = NOW();
  
  RAISE LOG 'User record created/updated: %', NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'ERROR in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger'ın var olduğunu kontrol et
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
      AND event_object_table = 'users'
      AND event_object_schema = 'auth'
  ) INTO trigger_exists;
  
  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'CRITICAL: Trigger on_auth_user_created does not exist! Run: CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created exists';
  END IF;
END $$;

-- 3. Sync existing users
SELECT * FROM public.sync_existing_auth_users();

-- 4. Verification
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users,
  (SELECT COUNT(*) FROM auth.users au 
   LEFT JOIN public.users pu ON au.id = pu.id 
   WHERE pu.id IS NULL) as missing_users;

-- ============================================
-- MANUEL TRIGGER OLUŞTURMA (Eğer trigger yoksa)
-- ============================================
-- Supabase Dashboard'da postgres user olarak çalıştırın:
--
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();
