-- ============================================
-- SEED: Estimation Settings for Pricing Engine
-- Date: 2026-07-20
-- Purpose: Add gran tahmin parametrelerini global_settings'e ekler
-- ============================================

INSERT INTO public.global_settings (key, value, description, category) VALUES
  ('estimation_shell_ratio', '{"value": 0.4, "unit": "ratio"}', 'Hacim tahmininde kabuk oranı (0.4 = %40)', 'pricing'),
  ('estimation_support_ratio', '{"value": 0.15, "unit": "ratio"}', 'Destek gram oranı (0.15 = %15)', 'pricing'),
  ('estimation_print_rate_fdm', '{"value": 15, "unit": "cm3_per_hour"}', 'FDM baskı hızı (cm³/saat)', 'pricing'),
  ('estimation_print_rate_sla', '{"value": 6, "unit": "cm3_per_hour"}', 'SLA baskı hızı (cm³/saat)', 'pricing'),
  ('estimation_default_layer_count', '{"value": 250, "unit": "count"}', 'Varsayılan katman sayısı (G-Code yoksa)', 'pricing')
ON CONFLICT (key) DO NOTHING;
