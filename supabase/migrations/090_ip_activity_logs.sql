
-- Migration: Create ip_activity_logs table
-- Tracks page visits by IP address for both authenticated and non-authenticated users

CREATE TABLE IF NOT EXISTS public.ip_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_agent TEXT,
    device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    page_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_activity_logs_ip ON public.ip_activity_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_activity_logs_created_at ON public.ip_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_activity_logs_user_id ON public.ip_activity_logs(user_id);

ALTER TABLE public.ip_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ip activity logs"
    ON public.ip_activity_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Service role can insert ip activity logs"
    ON public.ip_activity_logs FOR INSERT
    WITH CHECK (true);
