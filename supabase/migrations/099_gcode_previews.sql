-- ============================================
-- Migration 099: G-Code 3B önizleme önbelleği
-- ============================================
-- Amaç:
--   Fiyat için üretilen G-Code atılmıyor; aynı dosyadan katman katman takım
--   yolları (duvarlar, dolgu, köprüler, destek ayakları) çıkarılıp 3B
--   görüntüleyiciye veriliyor. Önizleme üretimi dilimleme kadar maliyetli
--   olduğu için (file_id, profile_hash) anahtarıyla kalıcı saklanır.
--
--   Anahtar, fiyat önbelleğiyle (`gcode_analysis_results`) birebir aynıdır:
--   kalite/doluluk/nozul/destek değişirse önizleme de değişir. Böylece müşteri
--   ödediği fiyatın karşılığı olan geometriyi görür, eski profilin önizlemesini
--   değil.
--
--   Dosyalar özel `gcode-previews` kovasında tutulur; istemciye yalnızca
--   kısa ömürlü imzalı URL verilir. Tablo yalnızca service_role tarafından
--   okunur/yazılır (RLS açık, politika yok).
--
-- Idempotent: tekrar çalıştırılabilir.
-- ============================================

-- ============================================
-- 1. ÖNİZLEME KAYITLARI
-- ============================================
CREATE TABLE IF NOT EXISTS public.gcode_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  profile_hash TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  segment_count INTEGER NOT NULL,
  layer_count INTEGER NOT NULL,
  engine TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gcode_previews IS
  'G-Code takım yolu önizlemesi; (file_id, profile_hash) başına tek satır.';
COMMENT ON COLUMN public.gcode_previews.storage_path IS
  'gcode-previews kovasındaki nesne yolu (gzip''li ikili önizleme).';
COMMENT ON COLUMN public.gcode_previews.profile_hash IS
  'gcode_analysis_results.profile_hash ile aynı dilimleme profili.';
COMMENT ON COLUMN public.gcode_previews.segment_count IS
  'İkili dosyadaki takım yolu segmenti sayısı (doğrulama için).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_gcode_previews_file_profile_unique
  ON public.gcode_previews (file_id, profile_hash);

CREATE INDEX IF NOT EXISTS idx_gcode_previews_file_id
  ON public.gcode_previews (file_id);

ALTER TABLE public.gcode_previews ENABLE ROW LEVEL SECURITY;

-- Bilinçli olarak politika eklenmez: yalnızca service_role erişir. İstemci
-- tabloyu hiç okumaz; imzalı URL ile doğrudan depodan indirir.

-- ============================================
-- 2. ÖZEL DEPOLAMA KOVASI
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gcode-previews',
  'gcode-previews',
  false,
  52428800, -- 50 MB; gerçek önizlemeler gzip'li ~1 MB
  ARRAY['application/octet-stream', 'application/gzip']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 3. POSTGREST ŞEMA ÖNBELLEĞİ
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- DOĞRULAMA (uygulandıktan sonra çalıştırın)
-- ============================================
--   select column_name, data_type from information_schema.columns
--   where table_name = 'gcode_previews' order by ordinal_position;
--
--   select id, public from storage.buckets where id = 'gcode-previews';
--
--   select indexname from pg_indexes where tablename = 'gcode_previews';
