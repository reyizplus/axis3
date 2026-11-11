-- Migration: Add color field to order_items
-- Purpose: Allow users to select print color during checkout
-- Date: 2026-04-22

-- Add color column to order_items table
ALTER TABLE order_items
ADD COLUMN color VARCHAR(50) DEFAULT 'Natural';

-- Add comment
COMMENT ON COLUMN order_items.color IS 'Print color selected by user (e.g., Natural, Black, White, Red, Blue, etc.)';

-- Update existing records to have default color
UPDATE order_items
SET color = 'Natural'
WHERE color IS NULL;
