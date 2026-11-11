-- =====================================================
-- Migration: 010_printer_build_volume
-- Description: Add printer maximum build volume settings
-- Author: Roo (CTO)
-- Date: 2026-04-18
-- =====================================================

-- Add printer build volume settings to global_settings
INSERT INTO public.global_settings (key, value, description, category) VALUES
  (
    'printer_max_build_volume',
    '{"x": 20, "y": 20, "z": 20, "unit": "cm"}',
    'Yazıcı maksimum baskı hacmi (cm cinsinden)',
    'operations'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add comment for documentation
COMMENT ON TABLE public.global_settings IS 'Global system settings including printer specifications, pricing, and operational parameters';
