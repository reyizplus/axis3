-- ============================================
-- MIGRATION 033: Add Cargo Days Setting
-- Date: 2026-04-22
-- Description: Add cargo_days field to production_capacity settings for admin-configurable shipping time
-- ============================================

-- Update production_capacity setting to include cargo_days
UPDATE system_settings
SET 
  value = jsonb_set(
    value,
    '{cargo_days}',
    '2'::jsonb,
    true
  ),
  description = 'Production capacity configuration for delivery estimation. machine_count: number of 3D printers available for parallel production. buffer_time_hours: additional time between productions for machine setup and quality control. working_hours_per_day: daily operational hours. working_days_per_week: operational days per week. cargo_days: shipping/delivery time in days (admin configurable).',
  updated_at = NOW()
WHERE key = 'production_capacity';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Verify cargo_days field was added
-- SELECT key, value->>'cargo_days' as cargo_days, value 
-- FROM system_settings 
-- WHERE key = 'production_capacity';
