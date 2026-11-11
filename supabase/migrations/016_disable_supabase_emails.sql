-- Migration: Disable Supabase Email Confirmations
-- Auto-confirm all new users to prevent Supabase from sending confirmation emails
-- We handle our own welcome emails via Resend

-- Function to auto-confirm new users
CREATE OR REPLACE FUNCTION public.handle_new_user_auto_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-confirm email immediately
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  
  -- Log for debugging
  RAISE LOG 'Auto-confirmed user: %', NEW.email;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

-- Create trigger to auto-confirm users on signup
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_auto_confirm();

-- Comment
COMMENT ON FUNCTION public.handle_new_user_auto_confirm() IS 
'Auto-confirms new users to disable Supabase confirmation emails. We send our own welcome emails via Resend.';
