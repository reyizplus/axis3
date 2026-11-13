-- ============================================
-- Migration 094: Stok fonksiyonlarında yetki kaçağını kapat
-- ============================================
-- 093 uygulandıktan sonra yapılan canlı doğrulamada iki sorun bulundu:
--
-- 1. `public.is_admin()` anonim çağrıda NULL dönebiliyor (JWT'de rol yok).
--    `COALESCE(auth.role() = 'service_role', FALSE) OR public.is_admin()`
--    ifadesi bu durumda NULL oluyor. PL/pgSQL'de `IF NOT NULL THEN` bloğu
--    ÇALIŞMAZ, yani yetki kontrolü sessizce atlanıyordu.
-- 2. Supabase'in varsayılan yetkileri public şemadaki yeni fonksiyonlara
--    `anon` rolüne EXECUTE veriyor. `REVOKE ... FROM PUBLIC` bunu kaldırmaz;
--    `anon` ayrıca açıkça revoke edilmeli.
--
-- Bu migration:
--   * is_stock_manager() her koşulda TRUE/FALSE döner (asla NULL olmaz),
--   * dört stok fonksiyonundaki kontrol `IS NOT TRUE` olur (NULL'da da reddeder),
--   * anon rolünün EXECUTE yetkisini açıkça kaldırır.
-- Idempotent: tekrar çalıştırılabilir.

-- ============================================
-- 1. AUTHORIZATION HELPER (never NULL)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_stock_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.role() = 'service_role', FALSE)
      OR COALESCE(public.is_admin(), FALSE);
$$;

REVOKE ALL ON FUNCTION public.is_stock_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_stock_manager() TO authenticated, service_role;

COMMENT ON FUNCTION public.is_stock_manager() IS
  'TRUE only for service_role or an admin. Always returns a boolean (never NULL).';

-- ============================================
-- 2. INVENTORY DEDUCTION (with ledger)
-- ============================================
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
    IF public.is_stock_manager() IS NOT TRUE THEN
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
-- 3. INVENTORY RESTORE (ledger-aware)
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
    IF public.is_stock_manager() IS NOT TRUE THEN
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

    -- 3a. Return to the exact rows that were deducted for this line (newest
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

    -- 3b. The ledger is authoritative for lines it knows about. When it
    -- already accounts for the full quantity, a retry must be a no-op.
    IF v_remaining > 0 AND p_order_id IS NOT NULL AND v_ledger_total >= p_quantity THEN
        v_remaining := 0;
    END IF;

    -- 3c. Legacy fallback: orders created before migration 093 have no ledger.
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
-- 4. STORE PRODUCT STOCK (authorization)
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
    IF public.is_stock_manager() IS NOT TRUE THEN
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
    IF public.is_stock_manager() IS NOT TRUE THEN
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
-- 5. EXECUTE GRANTS (explicitly remove anon)
-- ============================================
REVOKE ALL ON FUNCTION public.deduct_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decrement_store_product_stock(uuid, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_store_product_stock(uuid, integer)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.deduct_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_store_product_stock(uuid, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_store_product_stock(uuid, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.deduct_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid) IS
  'FIFO inventory deduction with per-row ledger entry. Service role or admin only.';
COMMENT ON FUNCTION public.restore_inventory_stock(uuid, varchar, integer, uuid, varchar, uuid, uuid) IS
  'Restores inventory using the order/item ledger; idempotent and exact per-row. Legacy orders fall back to the newest matching row. Service role or admin only.';

-- ============================================
-- 6. POSTGREST SCHEMA CACHE
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICATION (run manually)
-- ============================================
-- is_stock_manager anon için NULL değil FALSE dönmeli:
--   select public.is_stock_manager();  -- anon JWT ile false
--
-- anon EXECUTE yetkisi olmamalı (42501 / permission denied):
--   select has_function_privilege('anon',
--     'public.restore_inventory_stock(uuid,varchar,integer,uuid,varchar,uuid,uuid)','execute');
--
-- servis rolü çalışabilmeli (no-op):
--   select public.restore_inventory_stock(NULL, NULL, 0, NULL, 'FDM', NULL, NULL);
