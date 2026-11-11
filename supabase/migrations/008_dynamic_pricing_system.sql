-- =====================================================
-- Migration: 008_dynamic_pricing_system
-- Description: Global settings and material pricing infrastructure
-- Author: Roo (CTO)
-- Date: 2026-04-18
-- =====================================================

-- =====================================================
-- GLOBAL SETTINGS TABLE
-- Purpose: Centralized pricing configuration
-- Admin-only access via RLS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'pricing', 'operations', 'system'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing settings
INSERT INTO public.global_settings (key, value, description, category) VALUES
  ('electricity_rate_per_hour', '{"value": 15, "currency": "TRY", "unit": "per_hour"}', 'Saatlik elektrik maliyeti', 'pricing'),
  ('labor_rate_per_hour', '{"value": 50, "currency": "TRY", "unit": "per_hour"}', 'Saatlik işçilik maliyeti', 'pricing'),
  ('profit_margin_multiplier', '{"value": 1.3, "unit": "multiplier"}', 'Kar marjı çarpanı (1.3 = %30 kar)', 'pricing'),
  ('fixed_service_fee', '{"value": 25, "currency": "TRY", "unit": "per_order"}', 'Sabit servis ücreti', 'pricing'),
  ('vat_rate', '{"value": 0.20, "unit": "percentage"}', 'KDV oranı (%20)', 'pricing'),
  ('min_order_amount', '{"value": 50, "currency": "TRY"}', 'Minimum sipariş tutarı', 'operations'),
  ('max_file_size_mb', '{"value": 50, "unit": "MB"}', 'Maksimum dosya boyutu', 'system')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- MATERIALS TABLE EXPANSION
-- Add pricing and physical properties
-- =====================================================

-- Add new columns to existing materials table
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS cost_per_gram DECIMAL(10, 4) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS density DECIMAL(10, 4) DEFAULT 1.0, -- g/cm³
  ADD COLUMN IF NOT EXISTS print_speed_modifier DECIMAL(10, 2) DEFAULT 1.0, -- Speed multiplier
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock', -- 'in_stock', 'low_stock', 'out_of_stock'
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

-- Update existing materials with realistic pricing data
UPDATE public.materials SET
  cost_per_gram = CASE 
    WHEN name = 'PLA' THEN 0.025
    WHEN name = 'ABS' THEN 0.030
    WHEN name = 'PETG' THEN 0.035
    WHEN name = 'TPU' THEN 0.045
    WHEN name = 'Nylon' THEN 0.050
    WHEN name = 'Standard Resin' THEN 0.080
    WHEN name = 'Tough Resin' THEN 0.120
    WHEN name = 'Flexible Resin' THEN 0.150
    WHEN name = 'Castable Resin' THEN 0.200
    ELSE 0.030
  END,
  density = CASE
    WHEN technology = 'FDM' THEN 1.24 -- Average FDM filament density
    WHEN technology = 'SLA' THEN 1.15 -- Average resin density
    ELSE 1.20
  END,
  print_speed_modifier = CASE
    WHEN name = 'PLA' THEN 1.0
    WHEN name = 'ABS' THEN 0.9
    WHEN name = 'PETG' THEN 0.85
    WHEN name = 'TPU' THEN 0.6
    WHEN name = 'Nylon' THEN 0.8
    WHEN technology = 'SLA' THEN 0.7
    ELSE 1.0
  END,
  is_active = true,
  stock_status = 'in_stock',
  lead_time_days = CASE
    WHEN technology = 'FDM' THEN 1
    WHEN technology = 'SLA' THEN 2
    ELSE 1
  END
WHERE cost_per_gram = 0.0 OR cost_per_gram IS NULL;

-- =====================================================
-- PRINT SETTINGS TABLE EXPANSION
-- Add time estimation factors
-- =====================================================

ALTER TABLE public.print_settings
  ADD COLUMN IF NOT EXISTS time_multiplier DECIMAL(10, 2) DEFAULT 1.0, -- Time calculation factor
  ADD COLUMN IF NOT EXISTS quality_premium DECIMAL(10, 2) DEFAULT 0.0, -- Extra cost for quality
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update print settings with time multipliers
UPDATE public.print_settings SET
  time_multiplier = CASE
    WHEN layer_height <= 0.1 THEN 1.5 -- Ultra fine = slower
    WHEN layer_height <= 0.2 THEN 1.0 -- Standard
    WHEN layer_height <= 0.3 THEN 0.8 -- Draft = faster
    ELSE 1.0
  END,
  quality_premium = CASE
    WHEN layer_height <= 0.1 THEN 0.20 -- %20 extra for ultra fine
    WHEN layer_height <= 0.15 THEN 0.10 -- %10 extra for fine
    ELSE 0.0
  END,
  is_active = true
WHERE time_multiplier = 1.0 OR time_multiplier IS NULL;

-- =====================================================
-- PRICING HISTORY TABLE
-- Track price changes for analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id),
  print_setting_id UUID REFERENCES public.print_settings(id),
  volume_cm3 DECIMAL(10, 2),
  calculated_price DECIMAL(10, 2),
  price_breakdown JSONB, -- Detailed cost breakdown
  settings_snapshot JSONB, -- Global settings at calculation time
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pricing_history_file_id ON public.pricing_history(file_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON public.pricing_history(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Global Settings: Admin-only access
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read global settings" ON public.global_settings;
CREATE POLICY "Admin can read global settings"
  ON public.global_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can update global settings" ON public.global_settings;
CREATE POLICY "Admin can update global settings"
  ON public.global_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pricing History: Users can read their own, admins can read all
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own pricing history" ON public.pricing_history;
CREATE POLICY "Users can read their own pricing history"
  ON public.pricing_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = pricing_history.file_id
      AND files.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can read all pricing history" ON public.pricing_history;
CREATE POLICY "Admin can read all pricing history"
  ON public.pricing_history FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "System can insert pricing history" ON public.pricing_history;
CREATE POLICY "System can insert pricing history"
  ON public.pricing_history FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Will be controlled by application logic

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get current pricing settings
CREATE OR REPLACE FUNCTION public.get_pricing_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings JSONB;
BEGIN
  SELECT jsonb_object_agg(key, value)
  INTO settings
  FROM public.global_settings
  WHERE category = 'pricing';
  
  RETURN settings;
END;
$$;

-- Function to calculate print time estimate (hours)
CREATE OR REPLACE FUNCTION public.estimate_print_time(
  p_volume_cm3 DECIMAL,
  p_material_id UUID,
  p_print_setting_id UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_time DECIMAL;
  material_modifier DECIMAL;
  quality_modifier DECIMAL;
  total_time DECIMAL;
BEGIN
  -- Base time: ~1 hour per 10cm³ (rough estimate)
  base_time := p_volume_cm3 / 10.0;
  
  -- Get material speed modifier
  SELECT print_speed_modifier INTO material_modifier
  FROM public.materials
  WHERE id = p_material_id;
  
  -- Get quality time multiplier
  SELECT time_multiplier INTO quality_modifier
  FROM public.print_settings
  WHERE id = p_print_setting_id;
  
  -- Calculate total time
  total_time := base_time * COALESCE(material_modifier, 1.0) * COALESCE(quality_modifier, 1.0);
  
  -- Minimum 0.5 hours
  IF total_time < 0.5 THEN
    total_time := 0.5;
  END IF;
  
  RETURN ROUND(total_time, 2);
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.global_settings IS 'Centralized configuration for pricing and operations';
COMMENT ON TABLE public.pricing_history IS 'Historical record of all price calculations';
COMMENT ON COLUMN public.materials.cost_per_gram IS 'Material cost in TRY per gram';
COMMENT ON COLUMN public.materials.density IS 'Material density in g/cm³';
COMMENT ON COLUMN public.materials.print_speed_modifier IS 'Speed multiplier (1.0 = normal, <1.0 = slower)';
COMMENT ON FUNCTION public.get_pricing_settings IS 'Returns current pricing configuration as JSONB';
COMMENT ON FUNCTION public.estimate_print_time IS 'Estimates print time in hours based on volume and settings';

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_pricing_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.estimate_print_time(DECIMAL, UUID, UUID) TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
