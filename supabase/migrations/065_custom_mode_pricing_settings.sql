-- ============================================
-- AXIS3 - CUSTOM MODE PRICING SETTINGS
-- Version: 1.0
-- Date: 2026-06-09
-- Description: Add admin-configurable settings for custom/advanced mode pricing
-- ============================================

INSERT INTO public.global_settings (key, value, description, category) VALUES
  ('custom_mode_multiplier', '{"value": 1.0, "unit": "multiplier"}', 'Gelişmiş mod fiyat çarpanı (1.0 = aynı fiyat, 1.2 = %20 fazla)', 'pricing'),
  ('nozzle_base_size_mm', '{"value": 0.4, "unit": "mm"}', 'Nozul zaman hesaplaması için referans nozul çapı (0.4mm = standart)', 'pricing')
ON CONFLICT (key) DO NOTHING;
