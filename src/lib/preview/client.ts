/**
 * G-Code Önizleme — tarayıcı tarafı
 *
 * Sunucu önizlemeyi gzip'li ikili olarak imzalı URL ile verir. Burada iki iş
 * var: API'den önizleme tanımını almak ve ikiliyi açıp ayrıştırmak. Hiçbir
 * adımda geometri tahmin edilmez; dosya bozuksa hata fırlatılır ve görüntüleyici
 * STL görünümüne düşer.
 */

import { parseGcodePreviewBinary, type GcodePreviewData } from './format';

/** `/api/pricing/preview` gövdesi; `/api/pricing/slice` ile aynı seçimler. */
export interface GcodePreviewRequest {
  fileId: string;
  materialId: string;
  printSettingId?: string | null;
  nozzleSizeMm?: number | null;
  supportEnabled?: boolean | null;
  custom?: {
    layerHeight?: number | null;
    infillPercentage?: number | null;
    speedMultiplier?: number | null;
  } | null;
}

/** Sunucunun döndürdüğü imzalı önizleme tanımı. */
export interface GcodePreviewLink {
  url: string;
  byteSize: number;
  segmentCount: number;
  layerCount: number;
  engine: string | null;
  expiresInSeconds: number;
}

export interface GcodePreviewApiResult {
  success: boolean;
  cached?: boolean;
  profileHash?: string | null;
  preview?: GcodePreviewLink | null;
  /** Önizleme üretilemediyse nedeni (fiyat yine geçerlidir). */
  previewError?: string;
  code?: string;
  error?: string;
}

export class PreviewRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PreviewRequestError';
    this.code = code;
  }
}

/** Sunucudan önizleme bağlantısını ister. */
export async function requestGcodePreview(
  request: GcodePreviewRequest,
  signal?: AbortSignal
): Promise<GcodePreviewApiResult> {
  const response = await fetch('/api/pricing/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    signal,
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as GcodePreviewApiResult | null;

  if (!response.ok || !payload?.success) {
    throw new PreviewRequestError(
      payload?.code ?? 'preview_failed',
      payload?.error ?? `Önizleme isteği başarısız (${response.status})`
    );
  }

  return payload;
}

/** Gzip sihirli baytları. */
function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  if (!isGzip(bytes)) return bytes;

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Tarayıcı gzip açmayı desteklemiyor');
  }

  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** İmzalı URL'den önizlemeyi indirir, açar ve ayrıştırır. */
export async function loadGcodePreview(
  url: string,
  signal?: AbortSignal
): Promise<GcodePreviewData> {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Önizleme indirilemedi (${response.status})`);
  }

  const compressed = new Uint8Array(await response.arrayBuffer());
  const raw = await decompress(compressed);
  return parseGcodePreviewBinary(raw);
}
