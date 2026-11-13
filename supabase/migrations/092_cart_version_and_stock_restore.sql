-- ============================================
-- Migration 092: Cart version column + stock restore helpers
-- ============================================
-- 1. cart_items.cart_version: the cart service has always written this column
--    (optimistic versioning for cross-tab/cross-device sync) but no migration
--    ever created it. Every DB sync silently failed.
-- 2. increment_store_product_stock / restore_inventory_stock: allow the order
--    flow to roll back a stock deduction when the order or payment fails.
-- ============================================

-- ============================================
-- 1. CART VERSION
-- ============================================
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS cart_version BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.cart_items.cart_version IS
  'Optimistic concurrency version used by CartService to resolve cross-tab conflicts';

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_version
  ON public.cart_items(cart_id, cart_version);

-- ============================================
-- 2. STORE PRODUCT STOCK RESTORE
-- ============================================
CREATE OR REPLACE FUNCTION increment_store_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS VOID AS $$
DECLARE
    v_track_stock BOOLEAN;
BEGIN
    SELECT track_stock INTO v_track_stock
    FROM store_products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF NOT v_track_stock THEN
        RETURN;
    END IF;

    UPDATE store_products
    SET stock_quantity = stock_quantity + p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. INVENTORY (FILAMENT/RESIN) STOCK RESTORE
-- ============================================
-- NOTE: deduct_inventory_stock consumes stock FIFO across multiple inventory
-- rows, so an exact row-level restore is not possible without a ledger. This
-- helper returns the quantity to the most recent matching active row, which
-- preserves the aggregate on-hand quantity.
CREATE OR REPLACE FUNCTION restore_inventory_stock(
    p_material_id UUID,
    p_color VARCHAR,
    p_quantity INTEGER,
    p_nozzle_size_id UUID DEFAULT NULL,
    p_technology VARCHAR DEFAULT 'FDM'
) RETURNS VOID AS $$
DECLARE
    v_item_id UUID;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RETURN;
    END IF;

    SELECT id INTO v_item_id
    FROM inventory_items
    WHERE material_id = p_material_id
      AND color = p_color
      AND is_active = TRUE
      AND (p_nozzle_size_id IS NULL OR nozzle_size_id = p_nozzle_size_id)
      AND type = CASE WHEN p_technology = 'SLA' THEN 'resin' ELSE 'filament' END
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_item_id IS NULL THEN
        RAISE WARNING 'restore_inventory_stock: no matching inventory row for material %', p_material_id;
        RETURN;
    END IF;

    UPDATE inventory_items
    SET quantity_on_hand = quantity_on_hand + p_quantity
    WHERE id = v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_store_product_stock(UUID, INTEGER) IS
  'Returns stock to a store product. Used to roll back decrement_store_product_stock when an order fails.';
COMMENT ON FUNCTION restore_inventory_stock(UUID, VARCHAR, INTEGER, UUID, VARCHAR) IS
  'Returns filament/resin stock to the most recent matching inventory row. Used to roll back deduct_inventory_stock when an order fails.';

-- ============================================
-- 4. ORDER STOCK RELEASE FLAG
-- ============================================
-- Prevents double-restoring stock when both the client cancel endpoint and
-- the payment failure path try to release the same order.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.orders.stock_restored IS
  'True once the stock reserved for this order has been returned to inventory';

-- ============================================
-- 5. BUYER IDENTITY NUMBER (iyzico)
-- ============================================
-- iyzico requires the buyer's Turkish ID number. It used to be hardcoded to
-- '11111111111' for every customer. It is now stored per user and required
-- before a payment can be initialized.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS identity_number VARCHAR(11);

COMMENT ON COLUMN public.users.identity_number IS
  'Turkish ID number used as the iyzico buyer identityNumber (11 digits)';


