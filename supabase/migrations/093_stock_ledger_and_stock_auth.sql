-- ============================================
-- Migration 093: Per-row stock ledger + safe restores
-- ============================================
-- 1. `stock_movements` records every inventory deduction per inventory row,
--    tied to the exact `order_items` row it was made for. Restores therefore
--    go back to the exact inventory row (FIFO/cost distribution stays
--    correct), a retry cannot double-restore, and two lines that use the same
--    material+colour can never take each other's reserved stock.
-- 2. `order_items.stock_restored` / `store_order_items.stock_restored` make a
--    partially failed restore resumable instead of marking the whole order
--    restored.
-- 3. Stock RPCs now require service_role or an admin. Previously any
--    authenticated user (and anon, depending on grants) could call them and
--    drain or inflate inventory directly.
-- 4. Seed `filament_buffer_multiplier` so the pricing buffer is visible and
--    editable in the admin panel (default 1.05; existing values are kept).
-- ============================================

-- ============================================
-- 1. PER-ITEM RESTORE FLAGS
-- ============================================
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.store_order_items
  ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================
-- 2. STOCK MOVEMENT LEDGER
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('inventory', 'store')),
  item_id UUID NOT NULL,
  quantity_delta INTEGER NOT NULL,
  restored_quantity INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT 'order_deduct',
  material_id UUID,
  color TEXT,
  technology TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_movements_restored_bounds
    CHECK (restored_quantity >= 0 AND restored_quantity <= ABS(quantity_delta))
);

-- Tables created before this migration may already exist with an older shape.
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stock_movements_order
  ON public.stock_movements(order_id, item_type, material_id, color);

CREATE INDEX IF NOT EXISTS idx_stock_movements_order_item
  ON public.stock_movements(order_item_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item
  ON public.stock_movements(item_type, item_id);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view stock movements" ON public.stock_movements;
CREATE POLICY "Admins can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (public.is_admin());

COMMENT ON TABLE public.stock_movements IS
  'Per-row inventory ledger. Negative quantity_delta = deduction; restored_quantity tracks how much has been returned to the row.';

-- ============================================
-- 3. AUTHORIZATION HELPER
-- ============================================
CREATE OR REPLACE FUNCTION public.is_stock_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.role() = 'service_role', FALSE) OR public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.is_stock_manager() FROM PUBLIC;

-- ============================================
-- 4. INVENTORY DEDUCTION (with ledger)
-- ============================================
-- Drop every older signature first: otherwise a call with fewer arguments
-- could keep resolving to the old, unsecured function instead of the new one.
DROP FUNCTION IF EXISTS public.deduct_inventory_stock(uuid, varchar, integer, uuid, varchar);
DROP FUNCTION IF EXISTS public.deduct_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid);

CREATE OR REPLACE FUNCTION public.deduct_inventory_stock(
    p_material_id UUID,
    p_color VARCHAR,
    p_quantity INTEGER,
    p_nozzle_size_id UUID DEFAULT NULL,
    p_technology VARCHAR DEFAULT 'FDM',
    p_order_id UUID DEFAULT NULL,
    p_order_item_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining INTEGER := p_quantity;
    v_item RECORD;
    v_deducted INTEGER;
    v_short INTEGER := 0;
BEGIN
    IF NOT public.is_stock_manager() THEN
        RAISE EXCEPTION 'not authorized to modify inventory stock';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'invalid quantity: %', p_quantity;
    END IF;

    FOR v_item IN
        SELECT id, quantity_on_hand, color
        FROM inventory_items
        WHERE material_id = p_material_id
          AND color = p_color
          AND is_active = TRUE
          AND quantity_on_hand > 0
          AND (p_nozzle_size_id IS NULL OR nozzle_size_id = p_nozzle_size_id)
          AND type = CASE WHEN p_technology = 'SLA' THEN 'resin' ELSE 'filament' END
        ORDER BY created_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;

        v_deducted := LEAST(v_item.quantity_on_hand, v_remaining);

        UPDATE inventory_items
        SET quantity_on_hand = quantity_on_hand - v_deducted
        WHERE id = v_item.id;

        INSERT INTO stock_movements (
            order_id, order_item_id, item_type, item_id, quantity_delta, reason,
            material_id, color, technology
        ) VALUES (
            p_order_id, p_order_item_id, 'inventory', v_item.id, -v_deducted,
            'order_deduct', p_material_id, v_item.color, p_technology
        );

        v_remaining := v_remaining - v_deducted;
    END LOOP;

    IF v_remaining > 0 THEN
        v_short := v_remaining;
    END IF;

    RETURN jsonb_build_object('deducted', p_quantity - v_short, 'short', v_short);
END;
$$;

-- ============================================
-- 5. INVENTORY RESTORE (ledger-aware)
-- ============================================
DROP FUNCTION IF EXISTS public.restore_inventory_stock(uuid, varchar, integer, uuid, varchar);
DROP FUNCTION IF EXISTS public.restore_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid);

CREATE OR REPLACE FUNCTION public.restore_inventory_stock(
    p_material_id UUID,
    p_color VARCHAR,
    p_quantity INTEGER,
    p_nozzle_size_id UUID DEFAULT NULL,
    p_technology VARCHAR DEFAULT 'FDM',
    p_order_id UUID DEFAULT NULL,
    p_order_item_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining INTEGER := p_quantity;
    v_move RECORD;
    v_owed INTEGER;
    v_take INTEGER;
    v_item_id UUID;
    v_restored INTEGER := 0;
    v_ledger_used BOOLEAN := FALSE;
    v_ledger_rows INTEGER := 0;
    v_ledger_total INTEGER := 0;
BEGIN
    IF NOT public.is_stock_manager() THEN
        RAISE EXCEPTION 'not authorized to modify inventory stock';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RETURN jsonb_build_object('restored', 0, 'short', 0, 'ledger_used', FALSE);
    END IF;

    -- How much the ledger knows about this exact line, whether or not it has
    -- already been restored. Used to tell "nothing to do" apart from
    -- "this order predates the ledger".
    IF p_order_id IS NOT NULL THEN
        SELECT COUNT(*), COALESCE(SUM(ABS(quantity_delta)), 0)::INTEGER
        INTO v_ledger_rows, v_ledger_total
        FROM stock_movements
        WHERE order_id = p_order_id
          AND item_type = 'inventory'
          AND quantity_delta < 0
          AND (
            (p_order_item_id IS NOT NULL AND order_item_id = p_order_item_id)
            OR (
              p_order_item_id IS NULL
              AND material_id = p_material_id
              AND COALESCE(color, '') = COALESCE(p_color, '')
            )
          );
    END IF;

    -- 5a. Return to the exact rows that were deducted for this line (newest
    -- first). `restored_quantity` makes the operation idempotent.
    IF p_order_id IS NOT NULL THEN
        FOR v_move IN
            SELECT id, item_id, quantity_delta, restored_quantity
            FROM stock_movements
            WHERE order_id = p_order_id
              AND item_type = 'inventory'
              AND quantity_delta < 0
              AND restored_quantity < ABS(quantity_delta)
              AND (
                (p_order_item_id IS NOT NULL AND order_item_id = p_order_item_id)
                OR (
                  p_order_item_id IS NULL
                  AND material_id = p_material_id
                  AND COALESCE(color, '') = COALESCE(p_color, '')
                )
              )
            ORDER BY created_at DESC, id DESC
            FOR UPDATE
        LOOP
            IF v_remaining <= 0 THEN EXIT; END IF;

            v_owed := ABS(v_move.quantity_delta) - v_move.restored_quantity;
            v_take := LEAST(v_owed, v_remaining);

            UPDATE inventory_items
            SET quantity_on_hand = quantity_on_hand + v_take
            WHERE id = v_move.item_id;

            UPDATE stock_movements
            SET restored_quantity = restored_quantity + v_take
            WHERE id = v_move.id;

            v_remaining := v_remaining - v_take;
            v_restored := v_restored + v_take;
            v_ledger_used := TRUE;
        END LOOP;
    END IF;

    -- 5b. The ledger is authoritative for lines it knows about. When it
    -- already accounts for the full quantity, a retry must be a no-op.
    IF v_remaining > 0 AND p_order_id IS NOT NULL AND v_ledger_total >= p_quantity THEN
        v_remaining := 0;
    END IF;

    -- 5c. Legacy fallback: orders created before migration 093 have no ledger.
    -- Return the remainder to the newest matching active row. This preserves
    -- the aggregate quantity (the old behaviour).
    IF v_remaining > 0 THEN
        SELECT id INTO v_item_id
        FROM inventory_items
        WHERE material_id = p_material_id
          AND color = p_color
          AND is_active = TRUE
          AND (p_nozzle_size_id IS NULL OR nozzle_size_id = p_nozzle_size_id)
          AND type = CASE WHEN p_technology = 'SLA' THEN 'resin' ELSE 'filament' END
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;

        IF v_item_id IS NOT NULL THEN
            UPDATE inventory_items
            SET quantity_on_hand = quantity_on_hand + v_remaining
            WHERE id = v_item_id;

            v_restored := v_restored + v_remaining;
            v_remaining := 0;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'restored', v_restored,
        'short', GREATEST(v_remaining, 0),
        'ledger_used', v_ledger_used
    );
END;
$$;

-- ============================================
-- 6. STORE PRODUCT STOCK (authorization)
-- ============================================
CREATE OR REPLACE FUNCTION public.decrement_store_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_stock_manager() THEN
        RAISE EXCEPTION 'not authorized to modify store stock';
    END IF;

    UPDATE store_products
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id
      AND stock_quantity >= p_quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_store_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_track_stock BOOLEAN;
BEGIN
    IF NOT public.is_stock_manager() THEN
        RAISE EXCEPTION 'not authorized to modify store stock';
    END IF;

    SELECT track_stock INTO v_track_stock
    FROM store_products
    WHERE id = p_product_id;

    IF NOT FOUND OR NOT v_track_stock THEN
        RETURN;
    END IF;

    UPDATE store_products
    SET stock_quantity = stock_quantity + p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
END;
$$;

-- ============================================
-- 7. EXECUTE GRANTS
-- ============================================
-- Authenticated users may reach the functions, but the internal
-- `is_stock_manager()` check blocks everyone except admins and the service
-- role. Anonymous callers are blocked outright.
REVOKE ALL ON FUNCTION public.deduct_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_store_product_stock(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_store_product_stock(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.deduct_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_store_product_stock(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_store_product_stock(uuid, integer) TO authenticated, service_role;

-- ============================================
-- 8. PRICING BUFFER SETTING (visible in admin)
-- ============================================
INSERT INTO public.global_settings (key, value, description, category)
VALUES (
  'filament_buffer_multiplier',
  '{"value": 1.05, "enabled": true, "unit": "multiplier"}'::jsonb,
  'Filament fire/purge payı. 1.05 = %5 ek malzeme. Mevcut değer varsa korunur.',
  'pricing'
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON FUNCTION public.deduct_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid) IS
  'FIFO inventory deduction with per-row ledger entry. Service role or admin only.';

COMMENT ON FUNCTION public.restore_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid) IS
  'Restores inventory using the order/item ledger; idempotent and exact per-row. Legacy orders fall back to the newest matching row. Service role or admin only.';

-- ============================================
-- 9. POSTGREST SCHEMA CACHE
-- ============================================
-- The stock RPC signatures changed, so PostgREST must reload its schema cache
-- or it will keep answering "function not found" for the new arguments.
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICATION (run manually)
-- ============================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('order_items', 'store_order_items', 'stock_movements')
--   AND column_name IN ('stock_restored', 'order_item_id');
--
-- SELECT proname, pg_get_function_identity_arguments(oid)
-- FROM pg_proc
-- WHERE proname IN ('deduct_inventory_stock', 'restore_inventory_stock',
--                   'decrement_store_product_stock', 'increment_store_product_stock');
--
-- SELECT key, value FROM public.global_settings
-- WHERE key = 'filament_buffer_multiplier';
