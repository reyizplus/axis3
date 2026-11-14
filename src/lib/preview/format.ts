/**
 * G-Code Önizleme İkili Biçimi — okuma tarafı
 *
 * Biçim `slicer/gcode-preview.mjs` içinde üretilir. Buradaki tek iş onu
 * doğrulayarak çözmek; hiçbir alan "yoksa varsayılan" ile doldurulmaz, çünkü
 * eksik önizleme yanlış model göstermek demektir.
 *
 * Yerleşim (little-endian):
 *   0..3             : başlık JSON uzunluğu (uint32)
 *   4..4+len         : başlık JSON (UTF-8)
 *   align4           : Int16 konumlar (segment başına 6: x1 y1 z1 x2 y2 z2)
 *   +12*count        : Uint8 tür indeksleri
 *   align4           : katman indeksleri (Uint16 veya Uint32)
 *   +layerBytes*count: Uint16 hız (mm/s × 10)
 */

/** Görüntüleyicideki tek bir takım yolu türü (duvar, dolgu, destek…). */
export interface PreviewTypeInfo {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  /** Bu türün toplam ekstrüzyonu, mm. */
  extrusionMm: number;
  /** Bu türün seyahat uzunluğu, mm (yalnızca travel için > 0). */
  travelMm: number;
  /** Ölçülen süre, saniye (başlık toplamına ölçeklenmiş). */
  seconds: number;
  /** Başlıktaki toplam grama oranlanmış gram. */
  grams: number;
}

/** Tek bir görüntüleme katmanı. */
export interface PreviewLayerInfo {
  /** Katman Z yüksekliği, mm. */
  z: number;
  /** Katman kalınlığı, mm. */
  height: number;
  seconds: number;
  filamentMm: number;
  grams: number;
  supportGrams: number;
  /** Katmanda destek dışı en az bir bölüm var mı. */
  object: boolean;
}

export interface PreviewStats {
  grams: number;
  supportGrams: number;
  printSeconds: number;
  layerCount: number;
  filamentMm: number;
  filamentCost: number | null;
}

export interface PreviewBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface GcodePreviewMeta {
  version: number;
  engine: string;
  generatedBy: string | null;
  stats: PreviewStats;
  config: Record<string, string>;
  types: PreviewTypeInfo[];
  layers: PreviewLayerInfo[];
  /** Seyahat dahil tüm hareketlerin sınırları. */
  bounds: PreviewBounds;
  /** Yalnızca ekstrüzyon (destek dahil) sınırları; kamera buna göre kurulur. */
  printBounds: PreviewBounds;
  segmentCount: number;
  layerIndexBytes: 2 | 4;
  droppedSegments: number;
}

/** Çözülmüş önizleme: meta + tipize edilmiş diziler. */
export interface GcodePreviewData {
  meta: GcodePreviewMeta;
  /** Segment başına 6 Int16 (normalize edilmiş, ±32767). */
  positions: Int16Array;
  types: Uint8Array;
  layers: Uint16Array | Uint32Array;
  speeds: Uint16Array;
}

/** Biçim bozuk/eksik; çağıran taraf görüntüleyiciyi açmaz. */
export class PreviewFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreviewFormatError';
  }
}

function align4(value: number): number {
  return (value + 3) & ~3;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTriple(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}

function requireBounds(value: unknown, field: string): PreviewBounds {
  if (!isRecord(value) || !isTriple(value.min) || !isTriple(value.max)) {
    throw new PreviewFormatError(`Önizleme başlığında geçersiz sınır: ${field}`);
  }
  return { min: value.min, max: value.max };
}

function validateMeta(raw: unknown): GcodePreviewMeta {
  if (!isRecord(raw)) throw new PreviewFormatError('Önizleme başlığı bir nesne değil');
  if (raw.version !== 1) {
    throw new PreviewFormatError(`Desteklenmeyen önizleme sürümü: ${String(raw.version)}`);
  }

  const segmentCount = raw.segmentCount;
  if (typeof segmentCount !== 'number' || !Number.isInteger(segmentCount) || segmentCount <= 0) {
    throw new PreviewFormatError(`Geçersiz segment sayısı: ${String(segmentCount)}`);
  }

  if (raw.layerIndexBytes !== 2 && raw.layerIndexBytes !== 4) {
    throw new PreviewFormatError(
      `Geçersiz katman indeksi genişliği: ${String(raw.layerIndexBytes)}`
    );
  }

  if (!Array.isArray(raw.layers) || !Array.isArray(raw.types) || raw.types.length === 0) {
    throw new PreviewFormatError('Önizleme başlığında katman/tür listesi eksik');
  }

  const stats = raw.stats;
  if (!isRecord(stats)) throw new PreviewFormatError('Önizleme başlığında istatistik eksik');

  const numeric = (value: unknown, field: string): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new PreviewFormatError(`Önizleme başlığında geçersiz ${field}`);
    }
    return value;
  };

  const types: PreviewTypeInfo[] = raw.types.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.label !== 'string') {
      throw new PreviewFormatError(`Önizleme türü ${index} geçersiz`);
    }
    return {
      id: entry.id,
      label: entry.label,
      color: typeof entry.color === 'string' ? entry.color : '#94a3b8',
      visible: entry.visible !== false,
      extrusionMm: numeric(entry.extrusionMm ?? 0, `types[${index}].extrusionMm`),
      travelMm: numeric(entry.travelMm ?? 0, `types[${index}].travelMm`),
      seconds: numeric(entry.seconds ?? 0, `types[${index}].seconds`),
      grams: numeric(entry.grams ?? 0, `types[${index}].grams`),
    };
  });

  const layers: PreviewLayerInfo[] = raw.layers.map((entry, index) => {
    if (!isRecord(entry)) throw new PreviewFormatError(`Katman ${index} geçersiz`);
    return {
      z: numeric(entry.z, `layers[${index}].z`),
      height: numeric(entry.height ?? 0, `layers[${index}].height`),
      seconds: numeric(entry.seconds ?? 0, `layers[${index}].seconds`),
      filamentMm: numeric(entry.filamentMm ?? 0, `layers[${index}].filamentMm`),
      grams: numeric(entry.grams ?? 0, `layers[${index}].grams`),
      supportGrams: numeric(entry.supportGrams ?? 0, `layers[${index}].supportGrams`),
      object: entry.object === true,
    };
  });

  if (layers.length > (raw.layerIndexBytes === 2 ? 0xffff : 0xffffffff)) {
    throw new PreviewFormatError('Katman sayısı indeks genişliğini aşıyor');
  }

  return {
    version: 1,
    engine: typeof raw.engine === 'string' ? raw.engine : 'unknown',
    generatedBy: typeof raw.generatedBy === 'string' ? raw.generatedBy : null,
    stats: {
      grams: numeric(stats.grams, 'stats.grams'),
      supportGrams: numeric(stats.supportGrams ?? 0, 'stats.supportGrams'),
      printSeconds: numeric(stats.printSeconds ?? 0, 'stats.printSeconds'),
      layerCount: numeric(stats.layerCount, 'stats.layerCount'),
      filamentMm: numeric(stats.filamentMm ?? 0, 'stats.filamentMm'),
      filamentCost:
        typeof stats.filamentCost === 'number' && Number.isFinite(stats.filamentCost)
          ? stats.filamentCost
          : null,
    },
    config: isRecord(raw.config)
      ? Object.fromEntries(
          Object.entries(raw.config).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string'
          )
        )
      : {},
    types,
    layers,
    bounds: requireBounds(raw.bounds, 'bounds'),
    printBounds: requireBounds(raw.printBounds, 'printBounds'),
    segmentCount,
    layerIndexBytes: raw.layerIndexBytes,
    droppedSegments: typeof raw.droppedSegments === 'number' ? raw.droppedSegments : 0,
  };
}

/**
 * Sıkıştırılmış hâli **çözülmüş** ikiliyi ayrıştırır.
 *
 * @throws {PreviewFormatError}
 */
export function parseGcodePreviewBinary(bytes: Uint8Array): GcodePreviewData {
  if (bytes.byteLength < 8) throw new PreviewFormatError('Önizleme dosyası çok kısa');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLength = view.getUint32(0, true);
  if (headerLength === 0 || 4 + headerLength > bytes.byteLength) {
    throw new PreviewFormatError('Önizleme başlık uzunluğu geçersiz');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + headerLength)));
  } catch {
    throw new PreviewFormatError('Önizleme başlığı bozuk JSON');
  }

  const meta = validateMeta(parsed);
  const count = meta.segmentCount;

  const positionsStart = align4(4 + headerLength);
  const typesStart = positionsStart + count * 12;
  const layersStart = align4(typesStart + count);
  const speedsStart = layersStart + count * meta.layerIndexBytes;
  const expectedLength = speedsStart + count * 2;

  if (bytes.byteLength < expectedLength) {
    throw new PreviewFormatError(
      `Önizleme verisi eksik: ${bytes.byteLength} < ${expectedLength} bayt`
    );
  }

  // Kopyalayarak okuyoruz: alt tamponun hizası garanti değil ve DataView
  // üzerinden okumak hizalama sorunlarını tümden ortadan kaldırıyor.
  const positions = new Int16Array(count * 6);
  for (let i = 0; i < positions.length; i += 1) {
    positions[i] = view.getInt16(positionsStart + i * 2, true);
  }

  const types = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    types[i] = view.getUint8(typesStart + i);
  }

  const layers =
    meta.layerIndexBytes === 2 ? new Uint16Array(count) : new Uint32Array(count);
  for (let i = 0; i < count; i += 1) {
    const offset = layersStart + i * meta.layerIndexBytes;
    layers[i] =
      meta.layerIndexBytes === 2 ? view.getUint16(offset, true) : view.getUint32(offset, true);
  }

  const speeds = new Uint16Array(count);
  for (let i = 0; i < count; i += 1) {
    speeds[i] = view.getUint16(speedsStart + i * 2, true);
  }

  return { meta, positions, types, layers, speeds };
}
