-- ============================================
-- MIGRATION 013: Production Capacity Settings
-- Date: 2026-04-20
-- Description: Add production capacity configuration for intelligent delivery estimation
-- ============================================

-- Add production capacity settings to system_settings table
INSERT INTO system_settings (key, value, description, is_public) VALUES
(
  'production_capacity',
  '{
    "machine_count": 3,
    "buffer_time_hours": 2,
    "working_hours_per_day": 8,
    "working_days_per_week": 5
  }'::jsonb,
  'Production capacity configuration for delivery estimation. machine_count: number of 3D printers available for parallel production. buffer_time_hours: additional time between productions for machine setup and quality control. working_hours_per_day: daily operational hours. working_days_per_week: operational days per week.',
  false
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add estimated_print_hours column to order_items table
-- This stores the calculated print time for each item at order creation
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS estimated_print_hours DECIMAL(10, 2);

-- Add comment to the column
COMMENT ON COLUMN order_items.estimated_print_hours IS 'Estimated print time in hours for this item, calculated at order creation based on volume and material settings';

-- Create index for querying total production queue
CREATE INDEX IF NOT EXISTS idx_order_items_estimated_print_hours 
ON order_items(estimated_print_hours) 
WHERE estimated_print_hours IS NOT NULL;

-- Add estimated_delivery column to orders table if it doesn't exist
-- This should already exist from initial schema, but adding for safety
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'estimated_delivery'
  ) THEN
    ALTER TABLE orders ADD COLUMN estimated_delivery DATE;
    COMMENT ON COLUMN orders.estimated_delivery IS 'Estimated delivery date calculated based on production queue and capacity';
  END IF;
END $$;

-- Create index for querying orders by estimated delivery
CREATE INDEX IF NOT EXISTS idx_orders_estimated_delivery 
ON orders(estimated_delivery) 
WHERE estimated_delivery IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify production_capacity setting exists
-- SELECT * FROM system_settings WHERE key = 'production_capacity';

-- Verify order_items column exists
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'order_items' AND column_name = 'estimated_print_hours';

-- Verify orders column exists
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' AND column_name = 'estimated_delivery';
