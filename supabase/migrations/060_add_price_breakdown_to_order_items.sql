-- Migration: Add price_breakdown to order_items
-- Purpose: Store detailed cost breakdown for admin analysis
-- Date: 2026-04-27

-- Add price_breakdown column to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS price_breakdown JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN order_items.price_breakdown IS 'Detailed price breakdown including material cost, electricity, labor, service fee, profit margin (for admin analysis only)';

-- Create index for JSONB queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_order_items_price_breakdown ON order_items USING GIN (price_breakdown);
