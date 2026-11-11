-- Migration: Custom Password Reset Token System
-- Create our own password reset system to completely bypass Supabase emails

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT password_reset_tokens_token_key UNIQUE (token)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only service role can access)
CREATE POLICY "Service role can manage password reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW()
    OR used_at IS NOT NULL;
END;
$$;

-- Comment
COMMENT ON TABLE public.password_reset_tokens IS 
'Custom password reset tokens to bypass Supabase email system. Tokens expire after 1 hour.';

COMMENT ON FUNCTION public.cleanup_expired_reset_tokens() IS 
'Cleans up expired and used password reset tokens. Should be run periodically.';
