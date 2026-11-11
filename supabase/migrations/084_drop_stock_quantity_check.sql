-- Drop the CHECK (stock_quantity >= 0) constraint that prevents
-- decrementing stock when allow_backorder is true and stock is 0.
-- The RPC function decrement_store_product_stock already handles
-- business logic via track_stock and allow_backorder flags.

ALTER TABLE store_products DROP CONSTRAINT IF EXISTS store_products_stock_quantity_check;

-- Re-add as a soft warning constraint (allow negative for backorders)
ALTER TABLE store_products ADD CONSTRAINT store_products_stock_quantity_check
  CHECK (stock_quantity >= -999999);
