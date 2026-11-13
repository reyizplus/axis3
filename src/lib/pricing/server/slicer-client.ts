/**
 * Dilimleyici Sidecar İstemcisi
 *
 * Fiyat otoritesi gerçek gram/süre verisini bu istemci üzerinden alır. Bu yüzden
 * dosyanın en önemli kuralı şudur: dilimleyici bir sonuç üretmediyse burada
 * **uydurma sayı üretilmez**. Her başarısızlık sınıflandırılmış bir hataya
 * (servis yok / zaman aşımı / red) dönüşür ve çağıran taraf (rota, sipariş
 * servisi) buna göre karar verir.
 *
 * Sözleşme `slicer/server.mjs` ile birebir:
 *   POST <SLICER_URL>/slice  multipart { model, profile }  → { ok, grams, ... }
 *   GET  <SLICER_URL>/health                               → { ok, queueDepth }
 *
 * Node 26'da `fetch`, `FormData`, `Blob` ve `AbortSignal.timeout` yerleşiktir;
 * ek bağımlılık yoktur.
 */

import type { SliceProfileV1 } from './slicer-profile';

/** Dilimleme sonucunun fiyatlandırmada kullanılan özeti. */
export interface SliceStats {
  /** Toplam filaman (destek dahil), gram. */
  grams: number;
  /** Gerçek baskı süresi, saniye. */
  printSeconds: number;
  /** Katman sayısı (>= 1). */
  layerCount: number;
  /** Toplam filaman uzunluğu, mm (bilgilendirme amaçlı). */
  filamentMm: number;
  /** Dilimleme süresi, ms. Yanıtta varsa oradan, yoksa yerel ölçüm. */
  durationMs: number;
  /** Sonucu üreten motor, ör. `prusaslicer-2.5.0`. */
  engine: string;
}

/** Sidecar ayakta değil / bağlantı kurulamıyor / kuyruk dolu (503). */
export class SlicerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlicerUnavailableError';
  }
}

/** Dilimleme zaman aşımına uğradı (504 veya abort). */
export class SlicerTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlicerTimeoutError';
  }
}

/** Dilimleyici isteği reddetti (4xx) veya yanıt şeması geçersiz. */
export class SlicerRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlicerRejectedError';
  }
}

const DEFAULT_SLICER_URL = 'http://localhost:8000';

/** Karmaşık modellerde PrusaSlicer uzun sürebilir; plan 200 s öngörüyor. */
const DEFAULT_TIMEOUT_MS = 200_000;

/** Sağlık kontrolü asla istek yolunu bekletmemeli. */
const HEALTH_TIMEOUT_MS = 3_000;

/** 503 / ağ hatasında tek retry öncesi bekleme. */
const RETRY_DELAY_MS = 300;

/** Toplam deneme sayısı: ilk istek + bir retry. */
const MAX_ATTEMPTS = 2;

/** Hata mesajına taşınacak yanıt gövdesi sınırı. */
const RESPONSE_TEXT_LIMIT = 300;

/**
 * Servis adresi. Sondaki eğik çizgiler temizlenir; aksi halde `//slice` gibi
 * geçersiz bir yol oluşur.
 */
function resolveBaseUrl(): string {
  const configured = process.env.SLICER_URL?.trim();
  const base = configured && configured.length > 0 ? configured : DEFAULT_SLICER_URL;
  return base.replace(/\/+$/, '');
}

/** Token yalnızca tanımlıysa gönderilir (yerel geliştirmede boş olabilir). */
function requestHeaders(): Record<string, string> {
  const token = process.env.SLICER_TOKEN?.trim();
  return token ? { 'x-slicer-token': token } : {};
}

/**
 * STL ikili verisi ve profil tek bir multipart gövdede birleştirilir.
 * `Content-Type` sınırını `fetch` kendisi üretir; elle başlık yazılmaz.
 */
function buildSliceForm(stl: Buffer, filename: string, profile: SliceProfileV1): FormData {
  const form = new FormData();
  // Buffer bir ArrayBufferLike görünümüdür; kopya alarak Blob'a kesin bir
  // ArrayBuffer veriyoruz (havuzlanmış Buffer'ın fazla baytlarını taşımayız).
  form.append(
    'model',
    new Blob([new Uint8Array(stl)], { type: 'application/octet-stream' }),
    filename
  );
  form.append('profile', JSON.stringify(profile));
  return form;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/** AbortSignal.timeout 'TimeoutError', AbortController 'AbortError' fırlatır. */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** Yanıt gövdesini okur; okuma başarısız olursa boş string döner. */
async function readBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function snippet(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > RESPONSE_TEXT_LIMIT
    ? `${trimmed.slice(0, RESPONSE_TEXT_LIMIT)}…`
    : trimmed;
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Katman sayısı normalde sayıdır. Dizi gelirse (katman listesi) uzunluğu
 * kullanılır; boş dizi veya 1'den küçük değer geçersizdir.
 */
function layerCountOf(value: unknown): number | null {
  if (Array.isArray(value)) {
    return value.length >= 1 ? value.length : null;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.trunc(value);
  }
  return null;
}

/**
 * Yanıtı doğrular ve `SliceStats` üretir.
 *
 * `grams` ve `printSeconds` sonlu ve > 0 olmak zorunda; eksik veya 0 ise
 * `SlicerRejectedError`. Sessizce 0 dönmek fiyatı sıfıra yaklaştırırdı.
 */
function toSliceStats(
  payload: unknown,
  profile: SliceProfileV1,
  measuredDurationMs: number
): SliceStats {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new SlicerRejectedError('Dilimleyici yanıtı bir nesne değil');
  }

  const record = payload as Record<string, unknown>;

  if (record.ok === false) {
    const reason = typeof record.error === 'string' ? record.error : 'bilinmeyen hata';
    throw new SlicerRejectedError(`Dilimleyici başarısız oldu: ${snippet(reason)}`);
  }

  const grams = positiveNumber(record.grams);
  if (grams === null) {
    throw new SlicerRejectedError(
      `Dilimleyici geçerli gram değeri döndürmedi (grams=${String(record.grams)})`
    );
  }

  const printSeconds = positiveNumber(record.printSeconds);
  if (printSeconds === null) {
    throw new SlicerRejectedError(
      `Dilimleyici geçerli süre döndürmedi (printSeconds=${String(record.printSeconds)})`
    );
  }

  const layerCount = layerCountOf(record.layerCount);
  if (layerCount === null) {
    throw new SlicerRejectedError(
      `Dilimleyici geçerli katman sayısı döndürmedi (layerCount=${String(record.layerCount)})`
    );
  }

  // Filaman uzunluğu fiyata girmez; eksikse 0 bilgilendirme değeri taşınır.
  const filamentMm =
    typeof record.filamentMm === 'number' &&
    Number.isFinite(record.filamentMm) &&
    record.filamentMm >= 0
      ? record.filamentMm
      : 0;

  const durationMs =
    typeof record.durationMs === 'number' &&
    Number.isFinite(record.durationMs) &&
    record.durationMs >= 0
      ? record.durationMs
      : measuredDurationMs;

  const engine =
    typeof record.engine === 'string' && record.engine.trim().length > 0
      ? record.engine
      : profile.engine;

  return { grams, printSeconds, layerCount, filamentMm, durationMs, engine };
}

/**
 * STL'i sidecar dilimleyiciye gönderir ve gerçek gram/süre özetini döner.
 *
 * - 4xx (401/422/400 …) → `SlicerRejectedError`, retry yok.
 * - 503 veya bağlantı hatası → 300 ms sonra **bir kez** retry; yine olmazsa
 *   `SlicerUnavailableError`.
 * - 504 veya abort → `SlicerTimeoutError`.
 */
export async function sliceModel(
  stl: Buffer,
  filename: string,
  profile: SliceProfileV1,
  opts?: { timeoutMs?: number }
): Promise<SliceStats> {
  const url = `${resolveBaseUrl()}/slice`;
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = performance.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders(),
        body: buildSliceForm(stl, filename, profile),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new SlicerTimeoutError(`Dilimleyici ${timeoutMs} ms içinde yanıt vermedi (${url})`);
      }

      // Bağlantı reddedildi / DNS / soket hataları: servis yok sayılır ve bir
      // kez yeniden denenir.
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        continue;
      }

      throw new SlicerUnavailableError(
        `Dilimleyiciye ulaşılamadı (${url}): ${describeError(error)}`
      );
    }

    if (response.ok) {
      const raw = await readBody(response);
      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new SlicerRejectedError(
          `Dilimleyici bozuk JSON döndü (${response.status}): ${snippet(raw)}`
        );
      }
      return toSliceStats(payload, profile, Math.round(performance.now() - startedAt));
    }

    const body = await readBody(response);

    if (response.status === 503) {
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      throw new SlicerUnavailableError(`Dilimleyici kuyruğu dolu (503): ${snippet(body)}`);
    }

    if (response.status === 504) {
      throw new SlicerTimeoutError(`Dilimleme zaman aşımına uğradı (504): ${snippet(body)}`);
    }

    if (response.status >= 400 && response.status < 500) {
      throw new SlicerRejectedError(
        `Dilimleyici isteği reddetti (${response.status}): ${snippet(body)}`
      );
    }

    // Beklenmeyen 5xx: servis sağlıksız kabul edilir; 503 dışında retry yok.
    throw new SlicerUnavailableError(
      `Dilimleyici beklenmeyen durum kodu döndü (${response.status}): ${snippet(body)}`
    );
  }

  // Döngü yalnızca yukarıdaki dallardan biriyle biter; savunma amaçlı.
  throw new SlicerUnavailableError(`Dilimleyiciye ulaşılamadı (${url})`);
}

/**
 * Sidecar sağlık kontrolü. İzleme uçları bunu çağırdığı için **asla fırlatmaz**;
 * her başarısızlık `{ ok: false, queueDepth: 0 }` olarak döner.
 */
export async function slicerHealth(): Promise<{ ok: boolean; queueDepth: number }> {
  const url = `${resolveBaseUrl()}/health`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders(),
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });

    if (!response.ok) return { ok: false, queueDepth: 0 };

    const payload = (await response.json()) as unknown;
    if (typeof payload !== 'object' || payload === null) {
      return { ok: false, queueDepth: 0 };
    }

    const record = payload as Record<string, unknown>;
    const queueDepth =
      typeof record.queueDepth === 'number' &&
      Number.isFinite(record.queueDepth) &&
      record.queueDepth >= 0
        ? Math.trunc(record.queueDepth)
        : 0;

    return { ok: record.ok === true, queueDepth };
  } catch {
    return { ok: false, queueDepth: 0 };
  }
}
