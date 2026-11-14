/**
 * Seçimlerden Dilimleme Profiline (paylaşılan çözümleyici)
 *
 * Hem `/api/pricing/slice` rotası hem de sipariş oluşturma servisi AYNI
 * fonksiyonu kullanır. Amaç paritenin yapısal olması: iki taraf farklı
 * varsayılan veya farklı yuvarlama kullanırsa profil hash'i ayrışır, önbellek
 * ıskalar ve müşterinin gördüğü fiyat ile sipariş fiyatı sessizce değişir.
 *
 * Bu dosya bilinçli olarak yalnızca okuma yapar (no writes).
 */

import {
  buildSlicerProfile,
  type SliceProfileV1,
} from './slicer-profile';

/** Kullanıcı seçimlerinin dilimleme için gereken alt kümesi. */
export interface SliceSelectionInput {
  materialId: string;
  /** UUID veya 'custom'. Boş/undefined ise kalitenin kendi değerleri kullanılır. */
  printSettingId?: string | null;
  nozzleSizeMm?: number | null;
  /**
   * Destek yapıları. Kalite seçiminde de özel modda da geçerlidir; verilmezse
   * eski davranış korunur (destek açık).
   */
  supportEnabled?: boolean | null;
  custom?: {
    layerHeight?: number | null;
    infillPercentage?: number | null;
    /** Hız çarpanı: 1 = normal, 2 = iki kat hızlı. */
    speedMultiplier?: number | null;
    supportEnabled?: boolean | null;
  } | null;
}

export interface ResolvedSliceSelection {
  technology: 'FDM' | 'SLA';
  /** SLA'da null; FDM'de her zaman geçerli bir v1 profil. */
  profile: SliceProfileV1 | null;
  /** Profil üretilmediyse sebebi. */
  skipReason: 'sla' | null;
}

/** Seçimler dilimlemeye uygun değilse fırlatılır; rota bunu 400'e çevirir. */
export class SliceSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SliceSelectionError';
  }
}

export const DEFAULT_LAYER_HEIGHT_MM = 0.2;
export const DEFAULT_INFILL_PERCENTAGE = 20;
export const DEFAULT_PRINT_SPEED_MM_S = 60;
export const DEFAULT_NOZZLE_MM = 0.4;

export const LAYER_HEIGHT_MIN = 0.05;
export const LAYER_HEIGHT_MAX = 0.6;
export const INFILL_MIN = 5;
export const INFILL_MAX = 100;
export const SPEED_MULTIPLIER_MIN = 0.5;
export const SPEED_MULTIPLIER_MAX = 2;

/**
 * İstemci `customTimeMultiplier` gönderiyor (2 = iki kat yavaş), dilimleyici ise
 * `speedMultiplier` bekliyor (2 = iki kat hızlı). Tek dönüşüm noktası burasıdır:
 * rota ve sipariş servisi aynı fonksiyonu kullanır ki hash ayrışmasın.
 */
export function speedMultiplierFromTimeMultiplier(
  timeMultiplier: number | null | undefined
): number {
  const value = Number(timeMultiplier);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return 1 / value;
}

/** Supabase zincirini tiplerden bağımsız çözmek için küçük yardımcı. */
async function selectOne(
  client: unknown,
  table: string,
  columns: string,
  id: string
): Promise<Record<string, unknown> | null> {
  try {
    const query = (client as any).from(table).select(columns);
    const { data, error } = await query.eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

function requireRange(value: number, min: number, max: number, label: string): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new SliceSelectionError(
      `${label} ${min} ile ${max} arasında olmalı (gelen: ${String(value)})`
    );
  }
  return value;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Seçimleri dilimleme profiline çevirir.
 *
 * - Malzeme yok/pasif → `SliceSelectionError`.
 * - SLA → `{ technology: 'SLA', profile: null, skipReason: 'sla' }` (K3).
 * - `printSettingId` verilmişse katman/doluluk/hız DB'den okunur; istemciden
 *   gelen sayılara güvenilmez.
 * - Özel modda katman/doluluk/hız çarpanı doğrulanır.
 * - Destek seçimi üst düzey `supportEnabled` alanından gelir (varsayılan açık).
 */
export async function resolveSliceSelection(
  client: unknown,
  input: SliceSelectionInput
): Promise<ResolvedSliceSelection> {
  if (!input?.materialId) {
    throw new SliceSelectionError('Malzeme seçilmedi');
  }

  const material = await selectOne(
    client,
    'materials',
    'id, name, technology, density, is_active',
    input.materialId
  );

  if (!material) {
    throw new SliceSelectionError('Seçilen malzeme bulunamadı');
  }
  if (material.is_active === false) {
    throw new SliceSelectionError('Seçilen malzeme artık mevcut değil');
  }

  const technology: 'FDM' | 'SLA' = material.technology === 'SLA' ? 'SLA' : 'FDM';
  if (technology === 'SLA') {
    // Reçine bilinçli olarak hacim tahmininde kalır (K3).
    return { technology, profile: null, skipReason: 'sla' };
  }

  const density = numberOrNull(material.density);
  if (density === null || density <= 0) {
    throw new SliceSelectionError('Malzeme yoğunluğu tanımlı değil');
  }

  const materialType = typeof material.name === 'string' ? material.name : 'PLA';
  const nozzleMm =
    numberOrNull(input.nozzleSizeMm) ?? DEFAULT_NOZZLE_MM;
  if (!(nozzleMm > 0)) {
    throw new SliceSelectionError('Nozul çapı geçersiz');
  }

  const isCustom = !input.printSettingId || input.printSettingId === 'custom';

  let layerHeight = DEFAULT_LAYER_HEIGHT_MM;
  let infillPercentage = DEFAULT_INFILL_PERCENTAGE;
  let printSpeed = DEFAULT_PRINT_SPEED_MM_S;
  // Üst düzey destek seçimi her iki modda da geçerlidir; eski istemciler
  // göndermediğinde davranış değişmesin diye varsayılan açıktır.
  const supportEnabled =
    (input.supportEnabled ?? input.custom?.supportEnabled) !== false;

  if (isCustom) {
    const custom = input.custom ?? {};
    const speedMultiplier =
      numberOrNull(custom.speedMultiplier) ?? 1;

    layerHeight = requireRange(
      numberOrNull(custom.layerHeight) ?? DEFAULT_LAYER_HEIGHT_MM,
      LAYER_HEIGHT_MIN,
      LAYER_HEIGHT_MAX,
      'Katman yüksekliği'
    );
    infillPercentage = requireRange(
      numberOrNull(custom.infillPercentage) ?? DEFAULT_INFILL_PERCENTAGE,
      INFILL_MIN,
      INFILL_MAX,
      'Doluluk oranı'
    );
    printSpeed =
      DEFAULT_PRINT_SPEED_MM_S *
      requireRange(
        speedMultiplier,
        SPEED_MULTIPLIER_MIN,
        SPEED_MULTIPLIER_MAX,
        'Hız çarpanı'
      );
  } else {
    const printSetting = await selectOne(
      client,
      'print_settings',
      'id, name, technology, layer_height, infill_percentage, print_speed, is_active',
      String(input.printSettingId)
    );

    if (!printSetting) {
      throw new SliceSelectionError('Seçilen baskı kalitesi bulunamadı');
    }
    if (printSetting.is_active === false) {
      throw new SliceSelectionError('Seçilen baskı kalitesi artık mevcut değil');
    }
    if (printSetting.technology !== technology) {
      throw new SliceSelectionError('Seçilen baskı kalitesi bu malzeme ile uyumlu değil');
    }

    layerHeight = requireRange(
      numberOrNull(printSetting.layer_height) ?? DEFAULT_LAYER_HEIGHT_MM,
      LAYER_HEIGHT_MIN,
      LAYER_HEIGHT_MAX,
      'Katman yüksekliği'
    );
    infillPercentage = requireRange(
      numberOrNull(printSetting.infill_percentage) ?? DEFAULT_INFILL_PERCENTAGE,
      INFILL_MIN,
      INFILL_MAX,
      'Doluluk oranı'
    );
    printSpeed = requireRange(
      numberOrNull(printSetting.print_speed) ?? DEFAULT_PRINT_SPEED_MM_S,
      10,
      300,
      'Baskı hızı'
    );
  }

  const profile = buildSlicerProfile({
    technology,
    layerHeight,
    infillPercentage,
    printSpeed,
    nozzleMm,
    materialType,
    materialDensity: density,
    supportEnabled,
  });

  if (!profile) {
    throw new SliceSelectionError('Dilimleme profili oluşturulamadı (geçersiz seçim)');
  }

  return { technology, profile, skipReason: null };
}
