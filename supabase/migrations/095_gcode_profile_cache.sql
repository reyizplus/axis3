-- ============================================
-- Migration 095: G-Code analiz önbelleğini profil bazlı yap
-- ============================================
-- Sorun:
--   `gcode_analysis_results` satırlarında hangi dilimleme profiliyle
--   üretildiği bilgisi yoktu. Fiyat motoru "dosyanın en son analizi"ni
--   okuduğu için kullanıcı kalite/doluluk/nozul değiştirdiğinde ESKİ
--   analizle fiyat veriliyordu. Bu, müşteriye gösterilen fiyat ile
--   sunucunun hesapladığı fiyatın sessizce ayrışması demek.
--
-- Çözüm:
--   Her analiz satırı `profile_hash` taşır. Fiyat motoru yalnızca
--   (file_id, profile_hash) eşleşen satırı kullanır. Hash yoksa G-Code
--   hiç okunmaz, hacim tahminine düşülür.
--
-- Idempotent: tekrar çalıştırılabilir. Tablolar canlıda boş olduğu için
-- normal CREATE INDEX yeterli (CONCURRENTLY gerekmez).
-- ============================================

-- ============================================
-- 1. ANALİZ ÖNBELLEĞİ: profil kimliği
-- ============================================
ALTER TABLE public.gcode_analysis_results
  ADD COLUMN IF NOT EXISTS profile_hash TEXT,
  ADD COLUMN IF NOT EXISTS profile_json JSONB,
  ADD COLUMN IF NOT EXISTS engine TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

COMMENT ON COLUMN public.gcode_analysis_results.profile_hash IS
  'Dilimleme profilinin sha256(kararlı JSON) ilk 32 karakteri. Fiyat motoru bu değer olmadan G-Code okumaz.';
COMMENT ON COLUMN public.gcode_analysis_results.profile_json IS
  'Analizin üretildiği tam profil (denetim ve yeniden üretim için).';
COMMENT ON COLUMN public.gcode_analysis_results.engine IS
  'Analizi üreten motor, örn. prusaslicer-2.5.0.';
COMMENT ON COLUMN public.gcode_analysis_results.duration_ms IS
  'Dilimleme süresi (ms), performans izleme için.';

-- Aynı dosya + aynı profil için tek satır.
-- NULL profile_hash satırları (eski kayıtlar) bu kısıtlamadan etkilenmez:
-- PostgreSQL'de NULL değerler birbirinden farklı sayılır.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gcode_file_profile_unique
  ON public.gcode_analysis_results (file_id, profile_hash);

-- ============================================
-- 2. DİLİMLEME İŞLERİ: profil kimliği ve süre
-- ============================================
ALTER TABLE public.slicing_jobs
  ADD COLUMN IF NOT EXISTS profile_hash TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_slicing_jobs_profile_hash
  ON public.slicing_jobs(profile_hash);

COMMENT ON COLUMN public.slicing_jobs.profile_hash IS
  'Bu işin dilimlediği profilin hash''i; gcode_analysis_results ile eşleşir.';

-- ============================================
-- 3. POSTGREST ŞEMA ÖNBELLEĞİ
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- DOĞRULAMA (uygulandıktan sonra çalıştırın)
-- ============================================
-- Kolonlar:
--   select column_name, data_type from information_schema.columns
--   where table_name = 'gcode_analysis_results' and column_name in
--     ('profile_hash','profile_json','engine','duration_ms');
--
-- Benzersizlik:
--   select indexname, indexdef from pg_indexes
--   where tablename = 'gcode_analysis_results'
--     and indexname = 'idx_gcode_file_profile_unique';
--
-- RLS değişmedi: yazma service_role üzerinden yapılır, kullanıcı yalnızca
-- kendi dosyalarının analizini okur (migration 088 politikaları geçerli).
