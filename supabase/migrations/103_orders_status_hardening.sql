-- ============================================
-- 103: orders.status constraint hardening
-- ============================================
-- The canonical status list never contained the post-processing statuses
-- `washing` / `curing`; they only existed in application code and were removed
-- from the API/UI. This migration makes the database match that decision even
-- if a deployment had drifted and still accepted those values.
--
-- Safe to run repeatedly:
--   1. Any drifted rows are moved to `quality_check` (the closest real step).
--   2. Every check constraint on orders(status) that still mentions the old
--      values is dropped, by name, without guessing.
--   3. The canonical constraint is re-created and validated.

UPDATE public.orders
SET status = 'quality_check',
    updated_at = NOW()
WHERE status IN ('washing', 'curing');

DO $do$
DECLARE
  constraint_name record;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%washing%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', constraint_name.conname);
    RAISE NOTICE 'Dropped drifted orders status constraint: %', constraint_name.conname;
  END LOOP;
END;
$do$;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending',
      'payment_received',
      'preparing',
      'printing',
      'quality_check',
      'packaging',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    )
  ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT orders_status_check;

COMMENT ON CONSTRAINT orders_status_check ON public.orders IS
  'Canonical order lifecycle. washing/curing are not valid statuses (removed from API/UI).';
