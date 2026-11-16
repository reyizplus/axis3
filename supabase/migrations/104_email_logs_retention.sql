-- ============================================
-- 104: e-mail log retention
-- ============================================
-- email_logs is append-only and would grow forever. This adds a retention
-- function (default 90 days) and schedules it with pg_cron when available.
-- If pg_cron is not installed, the function can be called by any external
-- scheduler (Supabase scheduled function, cron job, etc.):
--
--   SELECT public.cleanup_email_logs(90);

CREATE OR REPLACE FUNCTION public.cleanup_email_logs(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH deleted AS (
    DELETE FROM public.email_logs
    WHERE created_at < NOW() - make_interval(days => GREATEST(retention_days, 7))
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM deleted;
$fn$;

COMMENT ON FUNCTION public.cleanup_email_logs(integer) IS
  'Deletes e-mail log rows older than retention_days (minimum 7). Returns the number of deleted rows.';

-- Server-only helper: never expose the delivery history to application users.
REVOKE ALL ON FUNCTION public.cleanup_email_logs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_email_logs(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_email_logs(integer) TO service_role;

-- Schedule a daily cleanup at 03:20 when pg_cron is available. All failures
-- are downgraded to notices so the migration never blocks a deployment.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';

    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-logs-retention') THEN
      PERFORM cron.schedule(
        'email-logs-retention',
        '20 3 * * *',
        $job$SELECT public.cleanup_email_logs(90);$job$
      );
    END IF;

    RAISE NOTICE 'email_logs retention scheduled: 90 days, daily at 03:20';
  ELSE
    RAISE NOTICE 'pg_cron unavailable: run SELECT public.cleanup_email_logs(90) from an external scheduler';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'email_logs retention could not be scheduled: %', SQLERRM;
END;
$do$;
