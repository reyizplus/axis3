import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSlicerProfile } from './slicer-profile';
import type { SliceProfileV1 } from './slicer-profile';
import {
  SlicerRejectedError,
  SlicerTimeoutError,
  SlicerUnavailableError,
  slicerHealth,
  sliceModel,
} from './slicer-client';

/**
 * Bu testler uygulama ile dilimleyici sidecar'ı arasındaki sözleşmeyi kilitler.
 *
 * Fiyat bu istemciden gelen gram/süre üzerinden hesaplandığı için en kritik kural
 * şudur: dilimleyici bir şey üretmediyse istemci **asla** uydurma sayı döndürmez.
 * Servis yoksa, zaman aşımına uğrarsa veya yanıt bozuksa çağıran taraf bunu
 * sınıflandırılmış bir hata ile öğrenir.
 */

const PROFILE: SliceProfileV1 = (() => {
  const built = buildSlicerProfile({
    technology: 'FDM',
    layerHeight: 0.2,
    infillPercentage: 20,
    printSpeed: 60,
    nozzleMm: 0.4,
    materialType: 'PLA',
    materialDensity: 1.24,
    supportEnabled: false,
  });
  if (!built) throw new Error('Test profili oluşturulamadı');
  return built;
})();

// 20 mm küpün gerçek PrusaSlicer çıktısına yakın bir gövde.
const OK_BODY = {
  ok: true,
  grams: 4.49,
  supportGrams: 0.75,
  printSeconds: 1151,
  layerCount: 100,
  filamentMm: 1450.2,
  durationMs: 4210,
  engine: 'prusaslicer-2.5.0',
};

const STL = Buffer.from('solid cube\nendsolid cube\n', 'utf-8');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/plain' } });
}

function fetchMock() {
  return vi.mocked(fetch);
}

/**
 * Retry beklemesi (300 ms) için sahte zamanlayıcıları ilerletir; gerçek zamanda
 * uyunmaz. Birden fazla adım, ilk fetch çözüldükten sonra kurulan zamanlayıcıyı
 * da yakalamak içindir.
 *
 * Dikkat: retry sırasında reddeden bir promise'e önceden handler bağlanmazsa
 * vitest "unhandled rejection" uyarısı verir; bu yüzden çağıranlar `guarded()`
 * kullanır.
 */
async function advanceRetryTimers(): Promise<void> {
  for (let step = 0; step < 8; step += 1) {
    await vi.advanceTimersByTimeAsync(400);
  }
}

/** Reddi hemen yakalar; sahte zamanlayıcı ilerletilirken hata sahipsiz kalmasın. */
function guarded<T>(promise: Promise<T>): Promise<T | Error> {
  return promise.catch((error: unknown) =>
    error instanceof Error ? error : new Error(String(error))
  );
}

beforeEach(() => {
  vi.stubEnv('SLICER_URL', 'http://slicer.test:8000/');
  vi.stubEnv('SLICER_TOKEN', 'test-token');
  vi.stubGlobal('fetch', vi.fn());
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('sliceModel - mutlu yol', () => {
  it('gerçek dilimleme sonucunu POST /slice üzerinden döner', async () => {
    fetchMock().mockResolvedValue(jsonResponse(OK_BODY));

    const stats = await sliceModel(STL, 'cube.stl', PROFILE);

    expect(stats).toEqual({
      grams: 4.49,
      supportGrams: 0.75,
      printSeconds: 1151,
      layerCount: 100,
      filamentMm: 1450.2,
      durationMs: 4210,
      engine: 'prusaslicer-2.5.0',
    });

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock().mock.calls[0];
    expect(String(url)).toBe('http://slicer.test:8000/slice');
    expect(init?.method).toBe('POST');

    const headers = new Headers(init?.headers);
    expect(headers.get('x-slicer-token')).toBe('test-token');

    // Multipart gövdesi elle kurulmaz: FormData alanları doğru olmalı.
    const form = init?.body;
    expect(form).toBeInstanceOf(FormData);
    const body = form as FormData;
    const profileField = body.get('profile');
    expect(typeof profileField).toBe('string');
    expect(JSON.parse(profileField as string)).toEqual(PROFILE);
    const modelField = body.get('model');
    expect(modelField).toBeInstanceOf(Blob);
    expect((modelField as File).name).toBe('cube.stl');
    expect((modelField as Blob).type).toBe('application/octet-stream');

    // AbortSignal.timeout ile sınırlandırılmış olmalı.
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('yanıtta durationMs yoksa süreyi yerel olarak ölçer', async () => {
    // JSON.stringify tanımsız alanı düşürür: sidecar durationMs göndermemiş olur.
    fetchMock().mockResolvedValue(jsonResponse({ ...OK_BODY, durationMs: undefined }));

    const stats = await sliceModel(STL, 'cube.stl', PROFILE);

    expect(stats.grams).toBe(4.49);
    expect(stats.durationMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(stats.durationMs)).toBe(true);
  });

  it('destek gramı yoksa 0, toplamdan büyükse toplamla sınırlanır', async () => {
    fetchMock().mockResolvedValueOnce(
      jsonResponse({ ...OK_BODY, supportGrams: undefined })
    );
    const withoutSupport = await sliceModel(STL, 'cube.stl', PROFILE);
    expect(withoutSupport.supportGrams).toBe(0);

    fetchMock().mockResolvedValueOnce(jsonResponse({ ...OK_BODY, supportGrams: 99 }));
    const clamped = await sliceModel(STL, 'cube.stl', PROFILE);
    expect(clamped.supportGrams).toBe(4.49);
  });
});

describe('sliceModel - hata eşlemesi', () => {
  it('401 token hatasını SlicerRejectedError olarak bildirir', async () => {
    fetchMock().mockResolvedValue(textResponse('token mismatch', 401));

    await expect(sliceModel(STL, 'cube.stl', PROFILE)).rejects.toBeInstanceOf(SlicerRejectedError);
    // 4xx yeniden denenmez.
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it('422 yanıtının gövdesini hata mesajına taşır', async () => {
    const stderr = 'Command line error: --layer-height invalid value: 0.2abc';
    fetchMock().mockResolvedValue(textResponse(stderr, 422));

    const error = await sliceModel(STL, 'cube.stl', PROFILE).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SlicerRejectedError);
    expect((error as Error).message).toContain('invalid value');
  });

  it('504 yanıtını SlicerTimeoutError olarak bildirir', async () => {
    fetchMock().mockResolvedValue(textResponse('slice timeout', 504));

    await expect(sliceModel(STL, 'cube.stl', PROFILE)).rejects.toBeInstanceOf(SlicerTimeoutError);
  });

  it('iptal (abort) SlicerTimeoutError üretir', async () => {
    const abort = new DOMException('The operation was aborted', 'TimeoutError');
    fetchMock().mockRejectedValue(abort);

    await expect(sliceModel(STL, 'cube.stl', PROFILE, { timeoutMs: 5 })).rejects.toBeInstanceOf(
      SlicerTimeoutError
    );
  });

  it('ilk istek 503 ise bir kez yeniden dener ve başarılı olur', async () => {
    fetchMock()
      .mockResolvedValueOnce(textResponse('queue full', 503))
      .mockResolvedValueOnce(jsonResponse(OK_BODY));

    const promise = sliceModel(STL, 'cube.stl', PROFILE);
    await advanceRetryTimers();
    const stats = await promise;

    expect(stats.grams).toBe(4.49);
    expect(fetchMock()).toHaveBeenCalledTimes(2);
  });

  it('503 iki kez gelirse SlicerUnavailableError üretir', async () => {
    fetchMock()
      .mockResolvedValueOnce(textResponse('queue full', 503))
      .mockResolvedValueOnce(textResponse('queue full', 503));

    const result = guarded(sliceModel(STL, 'cube.stl', PROFILE));
    await advanceRetryTimers();

    await expect(result).resolves.toBeInstanceOf(SlicerUnavailableError);
    expect(fetchMock()).toHaveBeenCalledTimes(2);
  });

  it('ağ hatasını (TypeError) bir kez denedikten sonra SlicerUnavailableError yapar', async () => {
    fetchMock()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'));

    const result = guarded(sliceModel(STL, 'cube.stl', PROFILE));
    await advanceRetryTimers();

    await expect(result).resolves.toBeInstanceOf(SlicerUnavailableError);
    expect(fetchMock()).toHaveBeenCalledTimes(2);
  });

  it('grams = 0 olan yanıtı reddeder, uydurma sayı döndürmez', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ...OK_BODY, grams: 0 }));

    await expect(sliceModel(STL, 'cube.stl', PROFILE)).rejects.toBeInstanceOf(SlicerRejectedError);
  });

  it('ok: true ama sayısal alanlar eksikse reddeder', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true, grams: 4.49, layerCount: 100 }));

    await expect(sliceModel(STL, 'cube.stl', PROFILE)).rejects.toBeInstanceOf(SlicerRejectedError);
  });

  it('bozuk JSON yanıtını reddeder', async () => {
    fetchMock().mockResolvedValue(textResponse('<html>502</html>', 200));

    await expect(sliceModel(STL, 'cube.stl', PROFILE)).rejects.toBeInstanceOf(SlicerRejectedError);
  });
});

describe('slicerHealth', () => {
  it('fetch hata verirse bile fırlatmaz', async () => {
    fetchMock().mockRejectedValue(new TypeError('fetch failed'));

    await expect(slicerHealth()).resolves.toEqual({ ok: false, queueDepth: 0 });
  });

  it('sağlıklı serviste kuyruk derinliğini döner', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse({ ok: true, engine: 'prusaslicer-2.5.0', queueDepth: 3 })
    );

    await expect(slicerHealth()).resolves.toEqual({ ok: true, queueDepth: 3 });

    const [url, init] = fetchMock().mock.calls[0];
    expect(String(url)).toBe('http://slicer.test:8000/health');
    expect(init?.method).toBe('GET');
  });
});
