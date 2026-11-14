import type { GcodePreviewData } from '@/lib/preview/format';

/** Dilimleme önizlemesi için gereken seçim (fiyat hesabıyla aynı alanlar). */
export interface SlicePreviewSelection {
  fileId: string;
  materialId: string;
  printSettingId?: string | null;
  nozzleSizeMm?: number | null;
  supportEnabled?: boolean;
  customLayerHeight?: number | null;
  customInfill?: number | null;
  customSpeed?: number | null;
  technology?: string | null;
}

/** Önizleme yükleme durumu. `ready` dışındaki her durumda STL gösterilir. */
export type PreviewStatus = 'idle' | 'loading' | 'ready' | 'fallback';

/** G-Code ayar bloğundaki anahtarların Türkçe karşılıkları. */
export const CONFIG_LABELS: Record<string, string> = {
  layer_height: 'Katman yüksekliği',
  first_layer_height: 'İlk katman',
  perimeters: 'Duvar sayısı',
  top_solid_layers: 'Üst katı katman',
  bottom_solid_layers: 'Alt katı katman',
  fill_density: 'Doluluk',
  fill_pattern: 'Dolgu deseni',
  nozzle_diameter: 'Nozul çapı',
  filament_type: 'Filament',
  filament_density: 'Yoğunluk',
  temperature: 'Nozul sıcaklığı',
  first_layer_temperature: 'İlk katman sıcaklığı',
  bed_temperature: 'Tabla sıcaklığı',
  first_layer_bed_temperature: 'İlk katman tabla',
  perimeter_speed: 'Duvar hızı',
  external_perimeter_speed: 'Dış duvar hızı',
  infill_speed: 'Dolgu hızı',
  solid_infill_speed: 'Katı dolgu hızı',
  travel_speed: 'Seyahat hızı',
  max_volumetric_speed: 'Maks. hacimsel hız',
  support_material: 'Destek',
  support_material_angle: 'Destek açısı',
  support_material_threshold: 'Destek eşiği',
  printer_model: 'Yazıcı',
  printer_variant: 'Varyant',
};

/** Başlıktaki ayar bloğundan yalnızca bilinen ve boş olmayanları seçer. */
export function readableConfig(
  data: GcodePreviewData | null
): Array<[label: string, value: string]> {
  if (!data) return [];
  return Object.entries(data.meta.config)
    .filter(([key, value]) => key in CONFIG_LABELS && value.trim() !== '')
    .map(([key, value]) => [CONFIG_LABELS[key], value] as [string, string]);
}
