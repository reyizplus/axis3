-- ============================================
-- AXIS3 - FIX DECREMENT STORE PRODUCT STOCK
-- Version: 1.0
-- Date: 2026-06-09
-- Description: Fix decrement_store_product_stock to respect track_stock and allow_backorder
-- ============================================

CREATE OR REPLACE FUNCTION decrement_store_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS VOID AS $$
DECLARE
    v_track_stock BOOLEAN;
    v_allow_backorder BOOLEAN;
    v_stock_quantity INTEGER;
BEGIN
    SELECT track_stock, allow_backorder, stock_quantity
    INTO v_track_stock, v_allow_backorder, v_stock_quantity
    FROM store_products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;

    -- If stock tracking is disabled, skip the decrement
    IF NOT v_track_stock THEN
        RETURN;
    END IF;

    -- If backorders are allowed, always decrement (can go negative)
    IF v_allow_backorder THEN
        UPDATE store_products
        SET stock_quantity = stock_quantity - p_quantity,
            updated_at = NOW()
        WHERE id = p_product_id;
        RETURN;
    END IF;

    -- Normal stock tracking: only decrement if sufficient stock
    UPDATE store_products
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id
    AND stock_quantity >= p_quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for product %: requested %, available %',
            p_product_id, p_quantity, v_stock_quantity;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
