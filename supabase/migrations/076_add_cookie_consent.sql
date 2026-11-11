-- Migration 076: Add cookie_consent column to users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cookie_consent text CHECK (cookie_consent IN ('accepted', 'declined'));

COMMENT ON COLUMN public.users.cookie_consent IS 'User cookie consent preference: accepted or declined';

-- After login/register, sync localStorage consent to DB
CREATE OR REPLACE FUNCTION public.sync_cookie_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is called manually; no auto-trigger needed
  RETURN NEW;
END;
$$;
