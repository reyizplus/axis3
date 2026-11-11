-- =====================================================
-- Migration: 089_pricing_v3_settings
-- Description: Pricing v3 — global_settings RLS fix + 
--              admin CRUD policies for v2 pricing tables
-- =====================================================

-- =====================================================
-- 1. FIX: Allow authenticated users to SELECT global_settings
--    (pricing engine needs to read these client-side)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read global_settings" ON public.global_settings;
CREATE POLICY "Anyone can read global_settings"
  ON public.global_settings FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 2. Ensure all pricing keys exist in global_settings
-- =====================================================
INSERT INTO public.global_settings (key, value, description, category) VALUES
  ('electricity_rate_per_hour', '{"value": 15, "currency": "TRY", "unit": "per_hour"}', 'Saatlik elektrik maliyeti', 'pricing'),
  ('labor_rate_per_hour', '{"value": 50, "currency": "TRY", "unit": "per_hour"}', 'Saatlik işçilik maliyeti', 'pricing'),
  ('profit_margin_multiplier', '{"value": 1.3, "unit": "multiplier"}', 'Kar marjı çarpanı (1.3 = %30 kar)', 'pricing'),
  ('fixed_service_fee', '{"value": 25, "currency": "TRY", "unit": "per_order"}', 'Sabit servis ücreti', 'pricing')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 3. machine_amortization: Admin CRUD policies
-- =====================================================
DROP POLICY IF EXISTS "Admin can manage machine_amortization" ON public.machine_amortization;
CREATE POLICY "Admin can manage machine_amortization"
  ON public.machine_amortization FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 4. risk_premium_settings: Admin CRUD policies
-- =====================================================
DROP POLICY IF EXISTS "Admin can manage risk_premium_settings" ON public.risk_premium_settings;
CREATE POLICY "Admin can manage risk_premium_settings"
  ON public.risk_premium_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 5. labor_time_settings: Admin CRUD policies
-- =====================================================
DROP POLICY IF EXISTS "Admin can manage labor_time_settings" ON public.labor_time_settings;
CREATE POLICY "Admin can manage labor_time_settings"
  ON public.labor_time_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 6. pricing_coefficients: Admin CRUD policies
--    (SELECT already open to authenticated from mig 088)
-- =====================================================
DROP POLICY IF EXISTS "Admin can manage pricing_coefficients" ON public.pricing_coefficients;
CREATE POLICY "Admin can manage pricing_coefficients"
  ON public.pricing_coefficients FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- END OF MIGRATION
-- =====================================================
