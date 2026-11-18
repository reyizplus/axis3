/**
 * Sipariş Kaleminden Dilimleme Seçimi
 *
 * Sipariş detayındaki 3B görüntüleyici, siparişin **gerçek** seçimleriyle
 * dilimleme önizlemesi ister. Bu eşleme burada tutulur çünkü:
 *
 * - Profil hash'i fiyat önbelleğiyle aynı olmalı; `order_items` alanlarının
 *   yanlış yorumlanması (özellikle hız çarpanının ters çevrilmesi) sessizce
 *   farklı bir profile yol açar.
 * - Saf ve istemci tarafında güvenli: sunucu modülleri (`node:crypto`) buraya
 *   sızmaz, bu yüzden arayüzde ve testte doğrudan kullanılabilir.
 */

import {
  speedMultiplierFromTimeMultiplier,
  type SlicePreviewSelection,
} from '@/lib/preview/selection';

/** `order_items` satırındaki önizlemeyle ilgili alanlar. */
export interface OrderItemSliceFields {
  file_id?: string | null;
  material_id?: string | null;
  /** Özel modda boş; fiyat akışında da aynı şekilde `null` saklanır. */
  print_setting_id?: string | null;
  nozzle_size_mm?: number | null;
  support_enabled?: boolean | null;
  custom_layer_height?: number | null;
  custom_infill_percentage?: number | null;
  /** Zaman çarpanı: 2 = iki kat yavaş (hız çarpanının tersi). */
  custom_time_multiplier?: number | null;
  /** Sipariş kaleminde saklanmaz; `materials.technology` alanından gelir. */
  material_technology?: string | null;
}

/**
 * Kalemi önizleme seçimine çevirir. Dosya/malzeme yoksa `null` döner (STL
 * görünümü). Kalite seçilmişse `print_setting_id` aynen geçirilir; özel modda
 * `'custom'` gönderilir, çünkü sunucu `null` gördüğünde özel alanları yok sayar
 * ve varsayılan profile düşer.
 */
export function sliceSelectionFromOrderItem(
  item: OrderItemSliceFields
): SlicePreviewSelection | null {
  if (!item.file_id || !item.material_id) return null;

  return {
    fileId: item.file_id,
    materialId: item.material_id,
    printSettingId: item.print_setting_id ?? 'custom',
    nozzleSizeMm: item.nozzle_size_mm ?? null,
    supportEnabled: item.support_enabled ?? true,
    customLayerHeight: item.custom_layer_height ?? null,
    customInfill: item.custom_infill_percentage ?? null,
    // Zaman çarpanı yoksa "normal hız" (1); sunucu da aynı varsayılanı kullanır.
    customSpeed: speedMultiplierFromTimeMultiplier(item.custom_time_multiplier),
    technology: item.material_technology ?? null,
  };
}
