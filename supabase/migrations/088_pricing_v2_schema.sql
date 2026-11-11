-- =====================================================
-- Migration: 087_pricing_v2_schema
-- Description: Yeni fiyatlandırma v2 altyapısı
--   - pricing_coefficients: Deneyimsel Düzeltme Katsayıları (ECF)
--   - machine_amortization: Makine saatlik amortisman ücretleri
--   - slicing_jobs: CuraEngine slicing iş kuyruğu takibi
--   - gcode_analysis_results: G-Code analiz sonuçları cache
--   - risk_premium_settings: Risk primi yapılandırması
-- Author: Axis3
-- Date: 2026-06-26
-- =====================================================

-- =====================================================
-- 1. DENEYİMSEL DÜZELTME KATSAYILARI (ECF)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pricing_coefficients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  value_minutes DECIMAL(8, 2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan ECF değerleri
INSERT INTO public.pricing_coefficients (key, label, value_minutes, description) VALUES
  ('warm_up_time', 'Yazıcı Isınma Süresi', 5.0, 'Yazıcının baskı sıcaklığına ulaşması için geçen süre (modern yazıcılar ~5dk)'),
  ('calibration_time', 'Kalibrasyon Süresi', 3.0, 'Tabla hizalama ve kalibrasyon adımları'),
  ('bed_prep_time', 'Tabla Hazırlık Süresi', 2.0, 'Tabla temizliği, yapıştırıcı/uygulama'),
  ('dead_time_per_part', 'Parça Başı Ölü Zaman', 1.0, 'Parçalar arası bekleme ve tabla değişimi')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. MAKİNE AMORTİSMAN AYARLARI
-- =====================================================
CREATE TABLE IF NOT EXISTS public.machine_amortization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  purchase_cost DECIMAL(12, 2),
  depreciation_months INTEGER DEFAULT 36,
  monthly_maintenance DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.machine_amortization (machine_type, label, hourly_rate, purchase_cost) VALUES
  ('FDM_STANDARD', 'Standart FDM Yazıcı', 5.0, 15000.0),
  ('FDM_INDUSTRIAL', 'Endüstriyel FDM Yazıcı', 15.0, 60000.0),
  ('SLA_STANDARD', 'Standart SLA Yazıcı', 10.0, 30000.0),
  ('SLA_INDUSTRIAL', 'Endüstriyel SLA Yazıcı', 25.0, 100000.0)
ON CONFLICT (machine_type) DO NOTHING;

-- =====================================================
-- 3. RİSK PRİMİ AYARLARI
-- =====================================================
CREATE TABLE IF NOT EXISTS public.risk_premium_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technology TEXT NOT NULL UNIQUE,
  premium_percentage DECIMAL(5, 2) NOT NULL DEFAULT 15.0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.risk_premium_settings (technology, premium_percentage, description) VALUES
  ('FDM', 15.0, 'FDM baskılar için risk primi (%15)'),
  ('SLA', 20.0, 'SLA baskılar için risk primi (%20)')
ON CONFLICT (technology) DO NOTHING;

-- =====================================================
-- 4. İŞÇİLİK ZAMAN AYARLARI
-- =====================================================
CREATE TABLE IF NOT EXISTS public.labor_time_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  base_minutes DECIMAL(8, 2) NOT NULL DEFAULT 0,
  per_complexity_minutes DECIMAL(8, 2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.labor_time_settings (task_type, label, base_minutes, per_complexity_minutes, description) VALUES
  ('file_prep', 'Dosya Hazırlık', 10.0, 5.0, 'STL düzenleme, onarım, boyutlandırma'),
  ('support_removal', 'Destek Ayıklama', 15.0, 10.0, 'Destek yapılarının temizlenmesi'),
  ('post_processing', 'Son İşlem', 10.0, 5.0, 'Zımparalama, boyama, kaplama')
ON CONFLICT (task_type) DO NOTHING;

-- =====================================================
-- 5. CURA SLICING İŞ KUYRUĞU
-- =====================================================
CREATE TABLE IF NOT EXISTS public.slicing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  profile_json JSONB,
  gcode_path TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slicing_jobs_file_id ON public.slicing_jobs(file_id);
CREATE INDEX IF NOT EXISTS idx_slicing_jobs_status ON public.slicing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_slicing_jobs_user_id ON public.slicing_jobs(user_id);

-- =====================================================
-- 6. G-CODE ANALİZ SONUÇLARI (CACHE)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gcode_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slicing_job_id UUID REFERENCES public.slicing_jobs(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  
  -- Gerçek filament tüketimi
  filament_weight_grams DECIMAL(10, 4),
  support_weight_grams DECIMAL(10, 4) DEFAULT 0,
  filament_length_mm DECIMAL(10, 2),
  
  -- Gerçek baskı süresi
  actual_print_time_seconds INTEGER,
  actual_print_time_hours DECIMAL(10, 2),
  
  -- Katman bilgisi
  total_layer_count INTEGER,
  min_layer_height_mm DECIMAL(6, 4),
  max_layer_height_mm DECIMAL(6, 4),
  
  -- Model istatistikleri
  total_travel_distance_mm DECIMAL(10, 2),
  total_extrusion_distance_mm DECIMAL(10, 2),
  retraction_count INTEGER,
  
  -- Ham G-Code header metadata
  raw_header JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gcode_file_id ON public.gcode_analysis_results(file_id);
CREATE INDEX IF NOT EXISTS idx_gcode_slicing_job_id ON public.gcode_analysis_results(slicing_job_id);

-- =====================================================
-- 7. FIRESTOK / WASTE MALZEME TAKİBİ (opsiyonel)
-- =====================================================
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS waste_percentage DECIMAL(5, 2) DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS preorder_allowed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS preorder_discount_percent DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- =====================================================
-- RLS POLİTİKALARI
-- =====================================================

-- pricing_coefficients: Admin CRUD, herkes SELECT
ALTER TABLE public.pricing_coefficients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read pricing_coefficients" ON public.pricing_coefficients;
CREATE POLICY "Anyone can read pricing_coefficients"
  ON public.pricing_coefficients FOR SELECT
  TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Admin can manage pricing_coefficients" ON public.pricing_coefficients;
CREATE POLICY "Admin can manage pricing_coefficients"
  ON public.pricing_coefficients FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- machine_amortization: Admin CRUD, herkes SELECT
ALTER TABLE public.machine_amortization ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read machine_amortization" ON public.machine_amortization;
CREATE POLICY "Anyone can read machine_amortization"
  ON public.machine_amortization FOR SELECT
  TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Admin can manage machine_amortization" ON public.machine_amortization;
CREATE POLICY "Admin can manage machine_amortization"
  ON public.machine_amortization FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- risk_premium_settings: Admin CRUD, herkes SELECT
ALTER TABLE public.risk_premium_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read risk_premium_settings" ON public.risk_premium_settings;
CREATE POLICY "Anyone can read risk_premium_settings"
  ON public.risk_premium_settings FOR SELECT
  TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Admin can manage risk_premium_settings" ON public.risk_premium_settings;
CREATE POLICY "Admin can manage risk_premium_settings"
  ON public.risk_premium_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- labor_time_settings: Admin CRUD, herkes SELECT
ALTER TABLE public.labor_time_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read labor_time_settings" ON public.labor_time_settings;
CREATE POLICY "Anyone can read labor_time_settings"
  ON public.labor_time_settings FOR SELECT
  TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Admin can manage labor_time_settings" ON public.labor_time_settings;
CREATE POLICY "Admin can manage labor_time_settings"
  ON public.labor_time_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- slicing_jobs: Kullanıcı kendi job'larını görebilir, admin hepsini
ALTER TABLE public.slicing_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own slicing_jobs" ON public.slicing_jobs;
CREATE POLICY "Users can read own slicing_jobs"
  ON public.slicing_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admin can read all slicing_jobs" ON public.slicing_jobs;
CREATE POLICY "Admin can read all slicing_jobs"
  ON public.slicing_jobs FOR SELECT
  TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "System can insert slicing_jobs" ON public.slicing_jobs;
CREATE POLICY "System can insert slicing_jobs"
  ON public.slicing_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "System can update slicing_jobs" ON public.slicing_jobs;
CREATE POLICY "System can update slicing_jobs"
  ON public.slicing_jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- gcode_analysis_results: Kullanıcı kendi dosyalarının sonuçlarını görebilir
ALTER TABLE public.gcode_analysis_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own gcode results" ON public.gcode_analysis_results;
CREATE POLICY "Users can read their own gcode results"
  ON public.gcode_analysis_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = gcode_analysis_results.file_id
      AND files.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Admin can read all gcode results" ON public.gcode_analysis_results;
CREATE POLICY "Admin can read all gcode results"
  ON public.gcode_analysis_results FOR SELECT
  TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "System can insert gcode results" ON public.gcode_analysis_results;
CREATE POLICY "System can insert gcode results"
  ON public.gcode_analysis_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================
GRANT SELECT ON public.pricing_coefficients TO authenticated;
GRANT SELECT ON public.machine_amortization TO authenticated;
GRANT SELECT ON public.risk_premium_settings TO authenticated;
GRANT SELECT ON public.labor_time_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.slicing_jobs TO authenticated;
GRANT SELECT, INSERT ON public.gcode_analysis_results TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.pricing_coefficients IS 'Deneyimsel Düzeltme Katsayıları (ECF) - Gerçekçi baskı süresi hesaplaması için';
COMMENT ON TABLE public.machine_amortization IS 'Makine saatlik amortisman ücretleri';
COMMENT ON TABLE public.risk_premium_settings IS 'Baskı başarısızlığına karşı risk primi yapılandırması';
COMMENT ON TABLE public.labor_time_settings IS 'İşçilik zaman maliyeti ayarları';
COMMENT ON TABLE public.slicing_jobs IS 'CuraEngine slicing iş kuyruğu takibi';
COMMENT ON TABLE public.gcode_analysis_results IS 'G-Code analiz sonuçları önbelleği';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
