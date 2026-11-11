-- Migration: Create user_activity_logs table
-- Tracks user page visits, device type, IP address for admin user detail page

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    page_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read activity logs
CREATE POLICY "Admins can read activity logs"
    ON public.user_activity_logs FOR SELECT
    USING (public.is_admin());

-- Service role can insert (from middleware)
CREATE POLICY "Service role can insert activity logs"
    ON public.user_activity_logs FOR INSERT
    WITH CHECK (true);
