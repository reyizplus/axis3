-- Rollback Migration: Remove Reorder System
-- This migration removes material_id and print_setting_id from order_items
-- Created: 2026-04-23

-- Drop indexes first
DROP INDEX IF EXISTS idx_order_items_material_id;
DROP INDEX IF EXISTS idx_order_items_print_setting_id;

-- Drop columns from order_items table
ALTER TABLE order_items DROP COLUMN IF EXISTS material_id;
ALTER TABLE order_items DROP COLUMN IF EXISTS print_setting_id;

-- Add comment
COMMENT ON TABLE order_items IS 'Order items table - reorder system columns removed';
