-- Migration: Add unique constraint on store_cart_items (user_id, product_id)
-- Prevents duplicate product entries per user at the database level
-- Enables upsert operations instead of delete+insert

-- Remove duplicate rows first, keeping only the latest entry per user+product
DELETE FROM public.store_cart_items
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, product_id) id
  FROM public.store_cart_items
  ORDER BY user_id, product_id, created_at DESC
);

-- Add the unique constraint
ALTER TABLE public.store_cart_items
ADD CONSTRAINT store_cart_items_user_product_unique
UNIQUE (user_id, product_id);

-- Update index to support the unique constraint lookups
DROP INDEX IF EXISTS idx_store_cart_items_user_id;
CREATE INDEX IF NOT EXISTS idx_store_cart_items_user_product ON public.store_cart_items(user_id, product_id);
