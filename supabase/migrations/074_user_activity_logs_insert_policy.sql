-- Migration: Add self-insert policy for user_activity_logs
-- Allows authenticated users to insert their own activity logs (used by middleware)

CREATE POLICY "Users can insert their own activity logs"
    ON public.user_activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
