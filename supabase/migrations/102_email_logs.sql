-- ============================================
-- 102: e-mail delivery log
-- ============================================
-- Transactional e-mails were fire-and-forget: when Resend rejected a message
-- (unverified domain, rate limit, bad recipient) the only trace was a console
-- line. This table records every attempt so support can answer "did the
-- customer get the mail?".

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient VARCHAR(320) NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  subject TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  provider_id TEXT,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type, created_at DESC);

-- Server-only: written by the service-role client inside the mail service.
-- There is intentionally no client policy, so an application user can never
-- read other customers' e-mail history.
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE email_logs FROM anon, authenticated;
GRANT ALL ON TABLE email_logs TO service_role;

COMMENT ON TABLE email_logs IS
  'Audit trail of transactional e-mails (sent / failed / skipped). Written by src/lib/services/mail-service.ts.';
