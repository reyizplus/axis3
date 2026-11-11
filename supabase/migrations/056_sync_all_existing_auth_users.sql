-- ============================================
-- MIGRATION 056: SYNC ALL EXISTING AUTH USERS
-- Date: 2026-04-23
-- Description: Sync all auth.users to public.users using the sync function
-- ============================================

-- Execute the sync function to create missing user records
SELECT * FROM public.sync_existing_auth_users();

-- Verify all users are synced
DO $$
DECLARE
  auth_count INTEGER;
  public_count INTEGER;
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO public_count FROM public.users;
  
  SELECT COUNT(*) INTO missing_count
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  RAISE NOTICE 'Auth users: %, Public users: %, Missing: %', auth_count, public_count, missing_count;
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Still % users missing in public.users!', missing_count;
  ELSE
    RAISE NOTICE 'All users successfully synced!';
  END IF;
END $$;

-- Update notification_preferences for all users
UPDATE users
SET notification_preferences = '{
  "email_order_updates": true,
  "email_marketing": false,
  "email_newsletter": false
}'::jsonb,
    updated_at = NOW()
WHERE notification_preferences IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check sync status
-- SELECT 
--   (SELECT COUNT(*) FROM auth.users) as auth_users,
--   (SELECT COUNT(*) FROM public.users) as public_users,
--   (SELECT COUNT(*) FROM auth.users au 
--    LEFT JOIN public.users pu ON au.id = pu.id 
--    WHERE pu.id IS NULL) as missing_users;

-- List missing users (if any)
-- SELECT au.id, au.email, au.created_at
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- WHERE pu.id IS NULL;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION public.sync_existing_auth_users() IS 
'Syncs all auth.users to public.users. This migration executes it to fix missing user records.';
