-- ============================================
-- Migration 100: Coupon (discount code) system
-- ============================================
-- 1. `coupons` holds both public campaign codes and single-person codes. A
--    bulk-generated run of personal codes shares one `batch_id`; the quota is
--    counted per campaign (`batch_id` when present, otherwise the coupon id).
-- 2. `coupon_redemptions` is the single source of truth. There is no counter
--    column: distinct users and redemption counts are derived from this table,
--    so a failed write can never leave the counters out of sync.
-- 3. A redemption starts as `reserved` with a short expiry. Payment success
--    promotes it to `consumed`; a failed/cancelled order releases it and the
--    quota reopens. Abandoned checkouts stop counting after the expiry.
-- 4. `redeem_coupon()` takes `pg_advisory_xact_lock` on the campaign key and
--    counts inside the lock, so two simultaneous payments can never exceed the
--    quota.
-- 5. When the quota fills, `exhausted_at` is stamped on every code of the
--    campaign: the campaign is closed for everyone, including users who have
--    redeemed it before. `is_active` stays the admin on/off switch, so an
--    automatic close can be distinguished from a manual one and reopened when
--    a reservation is released.
-- 6. Writes happen only through the service role (server API layer); the
--    client never reads the coupon tables directly.
-- 7. `is_personal` marks a code that came from a bulk run. When such a code is
--    handed out unassigned (`owner_user_id IS NULL`), anyone holding it can
--    redeem it once; assigning an owner makes it usable only by that user and
--    returns "Kupon bulunamadı" to everyone else.
-- ============================================

-- ============================================
-- 1. COUPONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value numeric(10, 2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  max_discount_amount numeric(10, 2) CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  min_order_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'service', 'store')),

  -- Validity window. "Unlimited" and "creation + N days" are both expressed
  -- here (ends_at is computed when the code is created).
  starts_at timestamptz,
  ends_at timestamptz,

  -- Quota: what is counted and how many.
  quota_basis text NOT NULL DEFAULT 'distinct_users' CHECK (quota_basis IN ('distinct_users', 'redemptions')),
  quota_limit integer CHECK (quota_limit IS NULL OR quota_limit > 0),

  -- Per-user usage.
  per_user_mode text NOT NULL DEFAULT 'single' CHECK (per_user_mode IN ('single', 'unlimited', 'limited')),
  per_user_limit integer CHECK (per_user_limit IS NULL OR per_user_limit > 0),

  first_order_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,

  -- Code models.
  is_personal boolean NOT NULL DEFAULT false,
  owner_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  batch_id uuid,
  batch_label text,

  -- Set automatically when the campaign quota fills.
  exhausted_at timestamptz,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT coupons_code_length CHECK (char_length(btrim(code)) BETWEEN 3 AND 64),
  CONSTRAINT coupons_window_valid CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  ),
  CONSTRAINT coupons_per_user_limit_valid CHECK (
    (per_user_mode = 'limited' AND per_user_limit IS NOT NULL) OR
    (per_user_mode <> 'limited')
  ),
  CONSTRAINT coupons_percentage_range CHECK (
    discount_type <> 'percentage' OR discount_value <= 100
  )
);

-- Case-insensitive uniqueness: "yaz10" and "YAZ10" are the same code.
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique ON public.coupons (upper(code));

-- A user cannot receive two codes from the same batch.
CREATE UNIQUE INDEX IF NOT EXISTS coupons_batch_owner_unique
  ON public.coupons (batch_id, owner_user_id)
  WHERE batch_id IS NOT NULL AND owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS coupons_owner_user_idx
  ON public.coupons (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS coupons_batch_idx
  ON public.coupons (batch_id)
  WHERE batch_id IS NOT NULL;

COMMENT ON TABLE public.coupons IS
  'Discount codes. batch_id groups bulk-generated personal codes; the quota is counted per campaign key.';
COMMENT ON COLUMN public.coupons.exhausted_at IS
  'Automatic hard close once the quota is full. Cleared when a release drops usage below the quota.';
COMMENT ON COLUMN public.coupons.is_active IS
  'Admin on/off switch. Separate from exhausted_at (automatic quota close).';

-- ============================================
-- 2. REDEMPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  campaign_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'consumed', 'released')),
  -- A reservation that is never confirmed stops counting after this moment.
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  released_at timestamptz,
  UNIQUE (coupon_id, order_id)
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_campaign_idx
  ON public.coupon_redemptions (campaign_key, status);

CREATE INDEX IF NOT EXISTS coupon_redemptions_user_idx
  ON public.coupon_redemptions (user_id, campaign_key);

CREATE INDEX IF NOT EXISTS coupon_redemptions_order_idx
  ON public.coupon_redemptions (order_id);

COMMENT ON TABLE public.coupon_redemptions IS
  'Every coupon use (reserved → consumed | released). The only source of truth for quota counting.';

-- Always derive the campaign key from the coupon so a caller cannot break
-- campaign-level quota accounting.
CREATE OR REPLACE FUNCTION public.set_coupon_campaign_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid;
BEGIN
  SELECT batch_id INTO v_batch_id FROM public.coupons WHERE id = NEW.coupon_id;
  NEW.campaign_key := COALESCE(v_batch_id, NEW.coupon_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_coupon_campaign_key ON public.coupon_redemptions;
CREATE TRIGGER set_coupon_campaign_key
  BEFORE INSERT ON public.coupon_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.set_coupon_campaign_key();

-- ============================================
-- 3. ORDER LINK
-- ============================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text;

-- orders.discount_amount already exists (001_initial_schema.sql).

CREATE INDEX IF NOT EXISTS idx_orders_coupon_id
  ON public.orders (coupon_id)
  WHERE coupon_id IS NOT NULL;

-- ============================================
-- 4. USAGE VIEW (derived counters)
-- ============================================
-- One shared definition of "counts as used": a confirmed redemption, or a
-- reservation that has not expired yet.
CREATE OR REPLACE FUNCTION public.coupon_redemption_active(
  p_status text,
  p_expires_at timestamptz
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_status = 'consumed'
      OR (p_status = 'reserved' AND (p_expires_at IS NULL OR p_expires_at > now()));
$$;

DROP VIEW IF EXISTS public.coupon_usage;
CREATE VIEW public.coupon_usage
WITH (security_invoker = true) AS
SELECT
  r.campaign_key,
  count(*) FILTER (WHERE public.coupon_redemption_active(r.status, r.expires_at)) AS redemption_count,
  count(DISTINCT r.user_id) FILTER (WHERE public.coupon_redemption_active(r.status, r.expires_at)) AS user_count
FROM public.coupon_redemptions r
GROUP BY r.campaign_key;

COMMENT ON VIEW public.coupon_usage IS
  'Derived quota counters per campaign key. Reserved-but-expired rows are ignored.';

-- Per-user counters for the rule engine ("single use", "N times").
DROP VIEW IF EXISTS public.coupon_user_usage;
CREATE VIEW public.coupon_user_usage
WITH (security_invoker = true) AS
SELECT
  r.campaign_key,
  r.user_id,
  count(*) FILTER (WHERE public.coupon_redemption_active(r.status, r.expires_at)) AS redemption_count
FROM public.coupon_redemptions r
GROUP BY r.campaign_key, r.user_id;

COMMENT ON VIEW public.coupon_user_usage IS
  'Derived per-user counters per campaign key.';

GRANT SELECT ON TABLE public.coupon_user_usage TO authenticated, service_role;

-- ============================================
-- 5. AUTHORIZATION HELPER
-- ============================================
CREATE OR REPLACE FUNCTION public.is_coupon_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.role() = 'service_role', FALSE) OR public.is_admin();
$$;

COMMENT ON FUNCTION public.is_coupon_manager() IS
  'True for the service role (server API) and admins. Coupon writes only happen through the service role.';

REVOKE ALL ON FUNCTION public.is_coupon_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_coupon_manager() TO authenticated, service_role;

-- ============================================
-- 6. CAMPAIGN HELPERS
-- ============================================
-- True when the given campaign key refers to this coupon: the batch id when
-- the coupon belongs to a bulk run, otherwise the coupon id itself.
CREATE OR REPLACE FUNCTION public.coupon_matches_campaign(
  p_coupon_id uuid,
  p_batch_id uuid,
  p_campaign_key uuid
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_batch_id IS NOT NULL AND p_batch_id = p_campaign_key)
      OR (p_batch_id IS NULL AND p_coupon_id = p_campaign_key);
$$;

CREATE OR REPLACE FUNCTION public.release_expired_coupon_reservations(p_campaign_key uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_released integer := 0;
BEGIN
  IF NOT public.is_coupon_manager() THEN
    RAISE EXCEPTION 'not authorized to release coupon reservations';
  END IF;

  UPDATE public.coupon_redemptions
  SET status = 'released', released_at = now()
  WHERE campaign_key = p_campaign_key
    AND status = 'reserved'
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  GET DIAGNOSTICS v_released = ROW_COUNT;
  RETURN v_released;
END;
$$;

-- Recomputes exhausted_at for a whole campaign from the redemption ledger.
-- Caller must hold the campaign advisory lock.
CREATE OR REPLACE FUNCTION public.refresh_coupon_exhaustion(p_campaign_key uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count integer;
  v_redemption_count integer;
  v_quota record;
  v_exhausted boolean := false;
BEGIN
  SELECT
    count(*) FILTER (WHERE public.coupon_redemption_active(r.status, r.expires_at)),
    count(DISTINCT r.user_id) FILTER (WHERE public.coupon_redemption_active(r.status, r.expires_at))
  INTO v_redemption_count, v_user_count
  FROM public.coupon_redemptions r
  WHERE r.campaign_key = p_campaign_key;

  -- Every distinct quota configured in the campaign must still have room. A
  -- batch shares its settings, so this is normally a single row.
  FOR v_quota IN
    SELECT DISTINCT quota_basis, quota_limit
    FROM public.coupons c
    WHERE c.quota_limit IS NOT NULL
      AND public.coupon_matches_campaign(c.id, c.batch_id, p_campaign_key)
  LOOP
    IF (v_quota.quota_basis = 'redemptions' AND v_redemption_count >= v_quota.quota_limit)
       OR (v_quota.quota_basis = 'distinct_users' AND v_user_count >= v_quota.quota_limit) THEN
      v_exhausted := true;
    END IF;
  END LOOP;

  UPDATE public.coupons c
  SET exhausted_at = CASE WHEN v_exhausted THEN COALESCE(c.exhausted_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE public.coupon_matches_campaign(c.id, c.batch_id, p_campaign_key)
    AND (
      (v_exhausted AND c.exhausted_at IS NULL)
      OR (NOT v_exhausted AND c.exhausted_at IS NOT NULL)
    );
END;
$$;

-- ============================================
-- 7. REDEEM
-- ============================================
-- Called by the server right after the order row is created. The server has
-- already priced the cart and validated scope/min-amount/first-order rules;
-- this function re-validates every state that can change between that read and
-- the write, and reserves the slot atomically.
--
-- Return shape:
--   { ok: true,  redemption_id, coupon_id, campaign_key, code, discount_amount }
--   { ok: false, reason }   -- reason matches the client-facing message map
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_coupon_id uuid,
  p_user_id uuid,
  p_order_id uuid,
  p_discount numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_campaign_key uuid;
  v_user_count integer := 0;
  v_redemption_count integer := 0;
  v_user_uses integer := 0;
  v_redemption_id uuid;
  v_revive_id uuid;
  v_redemption_status text;
  v_redemption_expires_at timestamptz;
  v_redemption_discount numeric;
  v_reason text;
BEGIN
  IF NOT public.is_coupon_manager() THEN
    RAISE EXCEPTION 'not authorized to redeem coupons';
  END IF;

  IF p_coupon_id IS NULL OR p_user_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'coupon_id, user_id and order_id are required';
  END IF;

  IF p_discount IS NULL OR p_discount < 0 THEN
    RAISE EXCEPTION 'invalid discount amount: %', p_discount;
  END IF;

  -- The order must exist and belong to the user (guards against a mismatched
  -- server call, never a client-supplied value).
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'order % does not belong to user %', p_order_id, p_user_id;
  END IF;

  SELECT * INTO v_coupon FROM public.coupons WHERE id = p_coupon_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- A personal code owned by someone else must look like a missing code.
  IF v_coupon.owner_user_id IS NOT NULL AND v_coupon.owner_user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inactive');
  END IF;

  v_campaign_key := COALESCE(v_coupon.batch_id, v_coupon.id);

  -- Serialize every redemption of the same campaign.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_campaign_key::text, 0));

  -- Drop reservations abandoned mid-checkout and refresh the automatic close
  -- flag before reading the rules again.
  PERFORM public.release_expired_coupon_reservations(v_campaign_key);
  PERFORM public.refresh_coupon_exhaustion(v_campaign_key);

  SELECT * INTO v_coupon FROM public.coupons WHERE id = p_coupon_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inactive');
  END IF;

  IF v_coupon.exhausted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'quota_exhausted');
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_started');
  END IF;

  IF v_coupon.ends_at IS NOT NULL AND now() > v_coupon.ends_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  -- Idempotency: a retried call for the same order must not consume twice.
  SELECT r.id, r.status, r.expires_at, r.discount_amount
  INTO v_redemption_id, v_redemption_status, v_redemption_expires_at, v_redemption_discount
  FROM public.coupon_redemptions r
  WHERE r.coupon_id = v_coupon.id AND r.order_id = p_order_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_redemption_status = 'consumed'
       OR (v_redemption_status = 'reserved'
           AND (v_redemption_expires_at IS NULL OR v_redemption_expires_at > now())) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'redemption_id', v_redemption_id,
        'coupon_id', v_coupon.id,
        'campaign_key', v_campaign_key,
        'code', v_coupon.code,
        'discount_amount', v_redemption_discount,
        'idempotent', true
      );
    END IF;

    -- Released or expired: revive the same row after the checks below instead
    -- of failing on the (coupon_id, order_id) unique constraint. `released`
    -- rows do not count towards the quota, so the checks stay accurate.
    v_revive_id := v_redemption_id;
  END IF;

  IF v_coupon.first_order_only AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.user_id = p_user_id
      AND o.id <> p_order_id
      AND o.status <> 'cancelled'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'first_order_only');
  END IF;

  SELECT
    count(*) FILTER (WHERE public.coupon_redemption_active(r.status, r.expires_at)),
    count(DISTINCT r.user_id) FILTER (WHERE public.coupon_redemption_active(r.status, r.expires_at))
  INTO v_redemption_count, v_user_count
  FROM public.coupon_redemptions r
  WHERE r.campaign_key = v_campaign_key;

  SELECT count(*) INTO v_user_uses
  FROM public.coupon_redemptions r
  WHERE r.campaign_key = v_campaign_key
    AND r.user_id = p_user_id
    AND public.coupon_redemption_active(r.status, r.expires_at);

  IF v_coupon.per_user_mode = 'single' AND v_user_uses >= 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'user_limit');
  END IF;

  IF v_coupon.per_user_mode = 'limited'
     AND v_user_uses >= COALESCE(v_coupon.per_user_limit, 1) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'user_limit');
  END IF;

  IF v_coupon.quota_limit IS NOT NULL THEN
    IF v_coupon.quota_basis = 'redemptions' AND v_redemption_count >= v_coupon.quota_limit THEN
      v_reason := 'quota_exhausted';
    ELSIF v_coupon.quota_basis = 'distinct_users' AND v_user_count >= v_coupon.quota_limit THEN
      v_reason := 'quota_exhausted';
    END IF;

    IF v_reason IS NOT NULL THEN
      -- Stamp the close now so the message is stable for everyone else.
      PERFORM public.refresh_coupon_exhaustion(v_campaign_key);
      RETURN jsonb_build_object('ok', false, 'reason', v_reason);
    END IF;
  END IF;

  IF v_revive_id IS NOT NULL THEN
    UPDATE public.coupon_redemptions
    SET status = 'reserved',
        released_at = NULL,
        expires_at = now() + interval '45 minutes',
        discount_amount = round(p_discount, 2)
    WHERE id = v_revive_id
    RETURNING id INTO v_redemption_id;
  ELSE
    INSERT INTO public.coupon_redemptions (
      coupon_id,
      campaign_key,
      user_id,
      order_id,
      discount_amount,
      status,
      expires_at
    ) VALUES (
      v_coupon.id,
      v_campaign_key,
      p_user_id,
      p_order_id,
      round(p_discount, 2),
      'reserved',
      now() + interval '45 minutes'
    )
    RETURNING id INTO v_redemption_id;
  END IF;

  -- Stamp/clear the automatic close state for the whole campaign.
  PERFORM public.refresh_coupon_exhaustion(v_campaign_key);

  RETURN jsonb_build_object(
    'ok', true,
    'redemption_id', v_redemption_id,
    'coupon_id', v_coupon.id,
    'campaign_key', v_campaign_key,
    'code', v_coupon.code,
    'discount_amount', round(p_discount, 2)
  );
END;
$$;

-- ============================================
-- 8. CONSUME / RELEASE
-- ============================================
-- Payment confirmed: the reservation becomes a real use.
CREATE OR REPLACE FUNCTION public.consume_coupon(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_consumed integer := 0;
BEGIN
  IF NOT public.is_coupon_manager() THEN
    RAISE EXCEPTION 'not authorized to consume coupons';
  END IF;

  -- Lock in a stable order so a concurrent release cannot deadlock.
  FOR v_row IN
    SELECT DISTINCT campaign_key
    FROM public.coupon_redemptions
    WHERE order_id = p_order_id
    ORDER BY campaign_key
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_row.campaign_key::text, 0));
  END LOOP;

  UPDATE public.coupon_redemptions
  SET status = 'consumed',
      consumed_at = now(),
      expires_at = NULL
  WHERE order_id = p_order_id
    AND status <> 'consumed';

  GET DIAGNOSTICS v_consumed = ROW_COUNT;

  FOR v_row IN
    SELECT DISTINCT campaign_key
    FROM public.coupon_redemptions
    WHERE order_id = p_order_id
  LOOP
    PERFORM public.refresh_coupon_exhaustion(v_row.campaign_key);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'consumed', v_consumed);
END;
$$;

-- Payment failed / order cancelled: give the slot back. Idempotent, and it
-- reopens the campaign when usage drops below the quota.
CREATE OR REPLACE FUNCTION public.release_coupon(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_released integer := 0;
BEGIN
  IF NOT public.is_coupon_manager() THEN
    RAISE EXCEPTION 'not authorized to release coupons';
  END IF;

  FOR v_row IN
    SELECT DISTINCT campaign_key
    FROM public.coupon_redemptions
    WHERE order_id = p_order_id
    ORDER BY campaign_key
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_row.campaign_key::text, 0));
  END LOOP;

  UPDATE public.coupon_redemptions
  SET status = 'released',
      released_at = now(),
      expires_at = NULL
  WHERE order_id = p_order_id
    AND status <> 'released';

  GET DIAGNOSTICS v_released = ROW_COUNT;

  FOR v_row IN
    SELECT DISTINCT campaign_key
    FROM public.coupon_redemptions
    WHERE order_id = p_order_id
  LOOP
    PERFORM public.refresh_coupon_exhaustion(v_row.campaign_key);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'released', v_released);
END;
$$;

-- ============================================
-- 9. RLS + PRIVILEGES
-- ============================================
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- No anon access at all: a coupon list must never be enumerable.
REVOKE ALL ON TABLE public.coupons FROM anon;
REVOKE ALL ON TABLE public.coupon_redemptions FROM anon;

-- Writes only through the service role (server actions / API routes).
REVOKE INSERT, UPDATE, DELETE ON TABLE public.coupons FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.coupon_redemptions FROM authenticated;

GRANT SELECT ON TABLE public.coupons TO authenticated, service_role;
GRANT SELECT ON TABLE public.coupon_redemptions TO authenticated, service_role;
GRANT SELECT ON TABLE public.coupon_usage TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can view coupons" ON public.coupons;
CREATE POLICY "Admins can view coupons"
  ON public.coupons FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins can view coupon redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (public.is_admin());

-- ============================================
-- 10. EXECUTE GRANTS
-- ============================================
REVOKE ALL ON FUNCTION public.release_expired_coupon_reservations(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_coupon_exhaustion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, uuid, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_coupon(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_coupon(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.release_expired_coupon_reservations(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_coupon_exhaustion(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(uuid, uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_coupon(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_coupon(uuid) TO service_role;

-- ============================================
-- 11. SETTINGS
-- ============================================
INSERT INTO public.global_settings (key, value, description, category)
VALUES (
  'coupons_enabled',
  'true'::jsonb,
  'Coupon field on the cart and checkout pages. Set to false for an emergency shutdown.',
  'system'
)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
