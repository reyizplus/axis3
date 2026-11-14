-- ============================================
-- Migration 098: Kullanılmayan işçilik karmaşıklık alanını kaldır
--
-- `labor_time_settings.per_complexity_minutes` hiçbir yerde okunmuyordu:
-- fiyat motoru yalnızca `base_minutes` değerlerini kullanıyor. Boş yere
-- duran alan kaldırılır; tablo ve admin tarafından düzenlenen baz süreler
-- (`base_minutes`) korunur, böylece fiyatlar değişmez.
--
-- Tekrar çalıştırılması güvenlidir.
-- ============================================

ALTER TABLE public.labor_time_settings
  DROP COLUMN IF EXISTS per_complexity_minutes;
