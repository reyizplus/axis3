-- ============================================
-- Migration 096: Makine saatlik ücreti makine fiyatından türetilsin
--
-- Sorun: `machine_amortization.hourly_rate` değerleri (5/15/10/25) elle
-- yazılmış sabitlerdi. Admin "makine fiyatı"nı güncellese bile fiyat
-- değişmiyordu; müşteriye gösterilen makine maliyeti DB'deki satın alma
-- bedeliyle açıklanamıyordu.
--
-- Kural artık şu:
--   hourly_rate > 0  → o değer kullanılır (elle geçersiz kılma)
--   hourly_rate = 0  → (purchase_cost / depreciation_months + monthly_maintenance) / 160
--
-- Bu migration eski sabitleri sıfırlar; böylece ücret, adminin girdiği
-- makine fiyatından türetilir. Tekrar çalıştırılması güvenlidir.
-- ============================================

UPDATE public.machine_amortization
SET hourly_rate = 0,
    updated_at = NOW()
WHERE hourly_rate IS DISTINCT FROM 0;

COMMENT ON COLUMN public.machine_amortization.hourly_rate IS
  'Saatlik makine ücreti. 0 ise ücret purchase_cost / depreciation_months + monthly_maintenance üzerinden 160 saat/ay ile türetilir.';
