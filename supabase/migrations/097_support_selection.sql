-- ============================================
-- Migration 097: Destek seçimi sepet ve sipariş satırlarında
--
-- Müşteri FDM baskıda destek yapılarını kapatabildiği için bu seçim fiyatı
-- (gram, süre, destek ayıklama işçiliği) ve dilimleme profil hash'ini
-- değiştiriyor. Önizleme ile sipariş aynı profil üzerinden fiyatlanmazsa
-- sessiz fiyat sapması oluşur; bu yüzden seçim kalıcı olarak saklanır.
-- ============================================

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS support_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS support_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.cart_items.support_enabled IS
  'Destek yapıları üretilsin mi. Fiyat ve dilimleme profili buna bağlıdır.';
COMMENT ON COLUMN public.order_items.support_enabled IS
  'Sipariş anındaki destek seçimi; fiyat doğrulamasında aynı profil kullanılır.';
