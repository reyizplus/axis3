/**
 * Dilimleme Profili Eşlemesi (saf)
 *
 * Fiyat otoritesi, seçilen kalite/malzeme/nozul değerlerini PrusaSlicer'ın
 * anlayacağı tek bir sürümlü profile çevirir. Profilin kendisi değil, kararlı
 * hash'i G-Code önbelleğinin anahtarıdır: aynı seçimler aynı hash'i üretmeli,
 * herhangi bir seçim değiştiğinde hash de değişmelidir. Aksi halde kalite
 * değişince eski dilimleme sonucu yeni seçimlerle eşleşir ve sessiz bir fiyat
 * sapması oluşur.
 *
 * Bu dosya bilinçli olarak saf: veritabanı, dosya sistemi veya ağ yok.
 */

import { createHash } from 'node:crypto';

/** Profil şemasının sürümü. Şema değişirse artırılır; eski hash'ler geçersiz olur. */
export const SLICE_PROFILE_VERSION = 1;

/** Profili üreten dilimleyici motoru ve sürümü (argümanlar bu sürüme göre sabitlendi). */
const SLICE_ENGINE = 'prusaslicer-2.5.0' as const;

/** Uygulamadan gelen ham seçimler. */
export interface SliceProfileInput {
  technology: 'FDM' | 'SLA';
  /** mm */
  layerHeight: number;
  /** 0..100 */
  infillPercentage: number;
  /** mm/s */
  printSpeed: number;
  nozzleMm: number;
  /** PLA | ABS | PETG | TPU | ASA */
  materialType: string;
  /** g/cm³ */
  materialDensity: number;
  supportEnabled: boolean;
}

/** Dilimleyiciye gönderilen sürümlü profil (v1). */
export interface SliceProfileV1 {
  v: 1;
  engine: 'prusaslicer-2.5.0';
  layerHeight: number;
  infillPercentage: number;
  printSpeed: number;
  nozzleMm: number;
  filamentDiameter: 1.75;
  materialType: string;
  materialDensity: number;
  nozzleTemp: number;
  bedTemp: number;
  supportEnabled: boolean;
}

export interface MaterialTemperature {
  nozzleTemp: number;
  bedTemp: number;
}

/**
 * Sıcaklık tablosu — tek kaynak. Testle sabitlenmiştir; buradaki bir değer
 * değişirse hash de değişir ve önbellek kendini yeniler.
 */
export const MATERIAL_TEMPERATURES: Readonly<Record<string, MaterialTemperature>> = {
  PLA: { nozzleTemp: 210, bedTemp: 60 },
  ABS: { nozzleTemp: 240, bedTemp: 100 },
  PETG: { nozzleTemp: 240, bedTemp: 80 },
  TPU: { nozzleTemp: 225, bedTemp: 50 },
  ASA: { nozzleTemp: 250, bedTemp: 100 },
};

/**
 * Bilinmeyen malzeme sessizce 0 °C ile dilimlenmesin diye PLA değerlerine düşer.
 * (Sıcaklık 0 olsaydı PrusaSlicer ya reddeder ya da anlamsız bir çıktı üretirdi.)
 */
export const FALLBACK_TEMPERATURE: Readonly<MaterialTemperature> = MATERIAL_TEMPERATURES.PLA;

/**
 * Malzeme adından kanonik türü çıkarır.
 *
 * Veritabanındaki adlar kısa kod değil, uzun addır:
 *   "PLA (Polylactic Acid)", "TPU (Thermoplastic Polyurethane)" ...
 * Bu adlar tablo anahtarlarıyla birebir eşleşmediği için sıcaklık araması
 * sessizce PLA'ya düşüyordu; ABS 240 °C yerine 210 °C ile dilimleniyordu.
 * Burada ad içinde geçen bilinen kodu arıyoruz (kelime sınırıyla, böylece
 * "POLYLACTIC" içindeki "PLA" eşleşmez).
 */
export function normalizeMaterialType(name: string): string {
  const upper = (name ?? '').trim().toUpperCase();
  if (!upper) return upper;

  // Uzun anahtarlar önce denenir (PETG'den önce başka bir çakışma olmasın).
  const keys = Object.keys(MATERIAL_TEMPERATURES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const pattern = new RegExp(`(^|[^A-Z0-9])${key}([^A-Z0-9]|$)`);
    if (pattern.test(upper)) return key;
  }

  return upper;
}

/**
 * Yuvarlama: katman 2, doluluk tam sayı, hız 1, yoğunluk 3 ondalık.
 *
 * Amaç kozmetik kayan nokta gürültüsünü (ör. 0.2 ile 0.20000000004) aynı hash'e
 * indirmek. Yuvarlama yapılmasaydı aynı fiziksel seçim farklı hash üretir ve
 * önbellek sürekli ıskalardı.
 */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Sonlu ve > 0 değilse null; yuvarlanmış hali de > 0 olmalı (0'a düşen değer kabul edilmez). */
function roundedPositive(value: number, decimals: number): number | null {
  if (!isPositiveFinite(value)) return null;
  const rounded = roundTo(value, decimals);
  return isPositiveFinite(rounded) ? rounded : null;
}

/**
 * Ham seçimleri sürümlü dilimleme profiline çevirir.
 *
 * - SLA → `null` (reçine bilinçli olarak hacim tahmininde kalır, K3).
 * - Sayısal alanlardan biri sonlu değilse veya <= 0 ise → `null`
 *   (varsayılan uydurup sessizce farklı bir şey dilimlemek yok).
 * - Bilinmeyen malzeme → PLA sıcaklıkları.
 */
export function buildSlicerProfile(input: SliceProfileInput): SliceProfileV1 | null {
  if (input.technology !== 'FDM') return null;

  const layerHeight = roundedPositive(input.layerHeight, 2);
  const infillPercentage = roundedPositive(input.infillPercentage, 0);
  const printSpeed = roundedPositive(input.printSpeed, 1);
  const materialDensity = roundedPositive(input.materialDensity, 3);

  if (
    layerHeight === null ||
    infillPercentage === null ||
    printSpeed === null ||
    materialDensity === null ||
    !isPositiveFinite(input.nozzleMm)
  ) {
    return null;
  }

  const materialType = normalizeMaterialType(input.materialType);
  const temperature = Object.hasOwn(MATERIAL_TEMPERATURES, materialType)
    ? MATERIAL_TEMPERATURES[materialType]
    : FALLBACK_TEMPERATURE;

  return {
    v: SLICE_PROFILE_VERSION,
    engine: SLICE_ENGINE,
    layerHeight,
    infillPercentage,
    printSpeed,
    nozzleMm: input.nozzleMm,
    filamentDiameter: 1.75,
    materialType,
    materialDensity,
    nozzleTemp: temperature.nozzleTemp,
    bedTemp: temperature.bedTemp,
    supportEnabled: Boolean(input.supportEnabled),
  };
}

/**
 * JSON.stringify'ın anahtar sırasına duyarlı olmayan hali.
 *
 * Nesne anahtarları özyinelemeli olarak sıralanır; diziler kendi sıralarını
 * korur. Böylece `{ a: 1, b: 2 }` ile `{ b: 2, a: 1 }` aynı string'i üretir ve
 * hash, nesnenin nasıl kurulduğuna değil yalnızca değerlerine bağlı olur.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

  return `{${entries.join(',')}}`;
}

/**
 * Profilin G-Code önbellek anahtarı: sha256 hex'in ilk 32 karakteri.
 *
 * 32 karakter (128 bit) doğum günü çakışması için fazlasıyla geniş ve
 * `gcode_analysis_results.profile_hash` metin sütunuyla uyumludur.
 */
export function profileHash(profile: SliceProfileV1): string {
  return createHash('sha256').update(stableStringify(profile)).digest('hex').slice(0, 32);
}
