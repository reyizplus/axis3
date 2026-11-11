-- Create pending_2fa_sessions table for temporary password storage during 2FA
CREATE TABLE IF NOT EXISTS pending_2fa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_2fa_sessions_email ON pending_2fa_sessions(email);
CREATE INDEX IF NOT EXISTS idx_pending_2fa_sessions_expires ON pending_2fa_sessions(expires_at);

-- Auto-delete expired sessions
CREATE OR REPLACE FUNCTION delete_expired_pending_2fa_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_2fa_sessions
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (service role only)
ALTER TABLE pending_2fa_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role can manage pending 2FA sessions"
  ON pending_2fa_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
