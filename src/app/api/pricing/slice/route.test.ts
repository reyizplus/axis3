/**
 * `/api/pricing/slice` rota testleri.
 *
 * Rota, fiyatın tek gerçek dilimleme giriş noktasıdır. Burada test edilen
 * sözleşme: oturum ve dosya sahipliği olmadan çalışmaz, SLA'yı hacim tahminine
 * bırakır, önbellek isabetinde dilimleyiciyi HİÇ çağırmaz ve hiçbir hata
 * yolunda uydurma gram/süre döndürmez.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const cacheMocks = vi.hoisted(() => ({
  getCachedAnalysis: vi.fn(),
  saveAnalysis: vi.fn(),
}));

const slicerMocks = vi.hoisted(() => ({
  sliceModel: vi.fn(),
  slicerHealth: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/pricing/server/analysis-cache', () => ({
  getCachedAnalysis: cacheMocks.getCachedAnalysis,
  saveAnalysis: cacheMocks.saveAnalysis,
}));

vi.mock('@/lib/pricing/server/slicer-client', () => {
  class SlicerUnavailableError extends Error {
    constructor(message = 'dilimleyici yok') {
      super(message);
      this.name = 'SlicerUnavailableError';
    }
  }
  class SlicerTimeoutError extends Error {
    constructor(message = 'zaman aşımı') {
      super(message);
      this.name = 'SlicerTimeoutError';
    }
  }
  class SlicerRejectedError extends Error {
    constructor(message = 'reddedildi') {
      super(message);
      this.name = 'SlicerRejectedError';
    }
  }
  return {
    sliceModel: slicerMocks.sliceModel,
    slicerHealth: slicerMocks.slicerHealth,
    SlicerUnavailableError,
    SlicerTimeoutError,
    SlicerRejectedError,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
  createServiceClient: supabaseMocks.createServiceClient,
}));

// eslint-disable-next-line import/first
import { POST } from './route';
// eslint-disable-next-line import/first
import {
  SlicerRejectedError,
  SlicerTimeoutError,
  SlicerUnavailableError,
} from '@/lib/pricing/server/slicer-client';

const USER_ID = 'user-1';
const FILE_ID = 'file-1';
const OTHER_USER_FILE_ID = 'file-2';
const SLA_FILE_ID = 'file-3';

const PLA = {
  id: 'mat-pla',
  name: 'PLA',
  technology: 'FDM',
  density: 1.24,
  is_active: true,
};

const RESIN = {
  id: 'mat-resin',
  name: 'Standart Reçine',
  technology: 'SLA',
  density: 1.15,
  is_active: true,
};

const QUALITY = {
  id: 'ps-hq',
  name: 'Yüksek Kalite',
  technology: 'FDM',
  layer_height: 0.1,
  infill_percentage: 30,
  print_speed: 40,
  is_active: true,
};

const STATS = {
  grams: 4.41,
  printSeconds: 1275,
  layerCount: 100,
  filamentMm: 1479.21,
  durationMs: 233,
  engine: 'prusaslicer-2.5.0',
};

interface Harness {
  /** Servis istemcisinde gözlenen yazma çağrıları (slicing_jobs). */
  jobInserts: Record<string, unknown>[];
  jobUpdates: Record<string, unknown>[];
  downloads: string[];
  service: unknown;
}

function createHarness(options: {
  userId?: string | null;
  files?: Record<string, Record<string, unknown> | null>;
  materials?: Record<string, Record<string, unknown> | null>;
} = {}): Harness {
  const jobInserts: Record<string, unknown>[] = [];
  const jobUpdates: Record<string, unknown>[] = [];
  const downloads: string[] = [];

  const rowsFor = (table: string): Record<string, unknown> | null => {
    if (table === 'files') return null; // dosya okuması ayrı istemciden
    if (table === 'slicing_jobs') return { id: 'job-1' };
    return null;
  };

  const builder = (table: string) => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({ data: rowsFor(table), error: null }),
      insert: (row: Record<string, unknown>) => {
        if (table === 'slicing_jobs') jobInserts.push(row);
        return builder;
      },
      update: (row: Record<string, unknown>) => {
        if (table === 'slicing_jobs') jobUpdates.push(row);
        return builder;
      },
    };
    return builder;
  };

  const service = {
    from: (table: string) => {
      if (table === 'materials') {
        const lookup = (id: unknown) => options.materials?.[String(id)] ?? null;
        const b: any = {
          select: () => b,
          eq: (_column: string, value: unknown) => {
            b.__value = value;
            return b;
          },
          maybeSingle: async () => ({ data: lookup(b.__value), error: null }),
        };
        return b;
      }
      if (table === 'print_settings') {
        const b: any = {
          select: () => b,
          eq: () => b,
          maybeSingle: async () => ({ data: QUALITY, error: null }),
        };
        return b;
      }
      return builder(table);
    },
    storage: {
      from: () => ({
        download: async (path: string) => {
          downloads.push(path);
          return { data: new Blob([Buffer.from('solid stl')]), error: null };
        },
      }),
    },
  };

  const authClient = {
    auth: {
      getUser: async () => ({
        data: { user: options.userId === null ? null : { id: options.userId ?? USER_ID } },
        error: options.userId === null ? new Error('no session') : null,
      }),
    },
    from: (table: string) => {
      if (table !== 'files') return builder(table);
      const b: any = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => {
          const id = options.files ? Object.keys(options.files)[0] : FILE_ID;
          return { data: options.files?.[id] ?? null, error: null };
        },
      };
      return b;
    },
  };

  supabaseMocks.createClient.mockResolvedValue(authClient);
  supabaseMocks.createServiceClient.mockReturnValue(service);

  return { jobInserts, jobUpdates, downloads, service };
}

function sliceRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/pricing/slice', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const FDM_BODY = {
  fileId: FILE_ID,
  materialId: 'mat-pla',
  printSettingId: 'ps-hq',
  nozzleSizeMm: 0.4,
};

beforeEach(() => {
  cacheMocks.getCachedAnalysis.mockReset();
  cacheMocks.saveAnalysis.mockReset();
  slicerMocks.sliceModel.mockReset();
  supabaseMocks.createClient.mockReset();
  supabaseMocks.createServiceClient.mockReset();
  cacheMocks.getCachedAnalysis.mockResolvedValue(null);
  cacheMocks.saveAnalysis.mockResolvedValue(undefined);
  slicerMocks.sliceModel.mockResolvedValue(STATS);
});

afterEach(() => {
  delete process.env.SLICING_ENABLED;
  delete process.env.PRICING_REQUIRE_SLICING;
});

describe('POST /api/pricing/slice', () => {
  it('oturum yoksa 401 döner ve dilimlemez', async () => {
    createHarness({ userId: null });

    const response = await POST(sliceRequest(FDM_BODY));

    expect(response.status).toBe(401);
    expect(slicerMocks.sliceModel).not.toHaveBeenCalled();
  });

  it('kill switch kapalıysa 503 döner', async () => {
    process.env.SLICING_ENABLED = 'false';
    createHarness();

    const response = await POST(sliceRequest(FDM_BODY));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('slicing_disabled');
    expect(slicerMocks.sliceModel).not.toHaveBeenCalled();
  });

  it('fileId yoksa 400 döner', async () => {
    createHarness();
    const response = await POST(sliceRequest({ materialId: 'mat-pla' }));
    expect(response.status).toBe(400);
  });

  it('başkasının dosyası için 403 döner', async () => {
    createHarness({
      files: {
        [OTHER_USER_FILE_ID]: {
          id: OTHER_USER_FILE_ID,
          user_id: 'someone-else',
          storage_path: 'models/x.stl',
          filename: 'x.stl',
        },
      },
    });

    const response = await POST(sliceRequest({ ...FDM_BODY, fileId: OTHER_USER_FILE_ID }));

    expect(response.status).toBe(403);
    expect(slicerMocks.sliceModel).not.toHaveBeenCalled();
  });

  it('SLA malzemede dilimlemez, hacim tahminine yönlendirir', async () => {
    createHarness({
      files: {
        [SLA_FILE_ID]: {
          id: SLA_FILE_ID,
          user_id: USER_ID,
          storage_path: 'models/resin.stl',
          filename: 'resin.stl',
        },
      },
      materials: { 'mat-resin': RESIN },
    });

    const response = await POST(
      sliceRequest({ fileId: SLA_FILE_ID, materialId: 'mat-resin', printSettingId: 'ps-hq' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, source: 'volume', reason: 'sla', profileHash: null });
    expect(slicerMocks.sliceModel).not.toHaveBeenCalled();
    expect(cacheMocks.saveAnalysis).not.toHaveBeenCalled();
  });

  it('önbellek isabetinde dilimleyiciyi çağırmaz', async () => {
    createHarness({
      files: { [FILE_ID]: { id: FILE_ID, user_id: USER_ID, storage_path: 'models/a.stl', filename: 'a.stl' } },
      materials: { 'mat-pla': PLA },
    });
    cacheMocks.getCachedAnalysis.mockResolvedValue({
      grams: 4.41,
      printSeconds: 1275,
      layerCount: 100,
      filamentMm: 1479.21,
      profileHash: 'cached',
      engine: 'prusaslicer-2.5.0',
    });

    const response = await POST(sliceRequest(FDM_BODY));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, source: 'slicing', cached: true });
    expect(body.stats.grams).toBe(4.41);
    expect(slicerMocks.sliceModel).not.toHaveBeenCalled();
  });

  it('önbellek ıskasında dilimler, kaydeder ve süre/gramı aynen döndürür', async () => {
    const harness = createHarness({
      files: { [FILE_ID]: { id: FILE_ID, user_id: USER_ID, storage_path: 'models/a.stl', filename: 'a.stl' } },
      materials: { 'mat-pla': PLA },
    });

    const response = await POST(sliceRequest(FDM_BODY));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, source: 'slicing', cached: false });
    expect(body.stats).toMatchObject({ grams: 4.41, printSeconds: 1275, layerCount: 100 });

    expect(harness.downloads).toEqual(['models/a.stl']);
    expect(slicerMocks.sliceModel).toHaveBeenCalledTimes(1);

    // Profil sunucuda çözülür ve hash'i ile birlikte yazılır.
    const saved = cacheMocks.saveAnalysis.mock.calls[0][1];
    expect(saved).toMatchObject({ fileId: FILE_ID });
    expect(saved.profileHash).toMatch(/^[0-9a-f]{32}$/);
    expect(saved.profileJson).toMatchObject({ v: 1, layerHeight: 0.1, infillPercentage: 30 });

    expect(harness.jobInserts).toHaveLength(1);
    expect(harness.jobUpdates.at(-1)).toMatchObject({ status: 'completed' });
  });

  it('dilimleyici yoksa 503 döner ve uydurma sayı üretmez', async () => {
    createHarness({
      files: { [FILE_ID]: { id: FILE_ID, user_id: USER_ID, storage_path: 'models/a.stl', filename: 'a.stl' } },
      materials: { 'mat-pla': PLA },
    });
    slicerMocks.sliceModel.mockRejectedValue(new SlicerUnavailableError('bağlantı yok'));

    const response = await POST(sliceRequest(FDM_BODY));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('slicer_unavailable');
    expect(body.stats).toBeUndefined();
    expect(cacheMocks.saveAnalysis).not.toHaveBeenCalled();
  });

  it('zaman aşımını 504, reddi 422 olarak eşler', async () => {
    createHarness({
      files: { [FILE_ID]: { id: FILE_ID, user_id: USER_ID, storage_path: 'models/a.stl', filename: 'a.stl' } },
      materials: { 'mat-pla': PLA },
    });

    slicerMocks.sliceModel.mockRejectedValueOnce(new SlicerTimeoutError('süre aştı'));
    expect((await POST(sliceRequest(FDM_BODY))).status).toBe(504);

    slicerMocks.sliceModel.mockRejectedValueOnce(new SlicerRejectedError('bozuk model'));
    expect((await POST(sliceRequest(FDM_BODY))).status).toBe(422);
  });

  it('aynı (dosya, profil) için eşzamanlı istekleri tek dilimlemeye indirger', async () => {
    createHarness({
      files: { [FILE_ID]: { id: FILE_ID, user_id: USER_ID, storage_path: 'models/a.stl', filename: 'a.stl' } },
      materials: { 'mat-pla': PLA },
    });

    let release: (value: typeof STATS) => void = () => undefined;
    slicerMocks.sliceModel.mockImplementation(
      () => new Promise((resolve) => {
        release = resolve;
      })
    );

    const first = POST(sliceRequest(FDM_BODY));
    const second = POST(sliceRequest(FDM_BODY));

    // İkinci istek ilkinin promise'ini beklemeli: dilimleme bir kez çağrılır.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(slicerMocks.sliceModel).toHaveBeenCalledTimes(1);

    release(STATS);
    const [a, b] = await Promise.all([first, second]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(slicerMocks.sliceModel).toHaveBeenCalledTimes(1);
    expect(cacheMocks.saveAnalysis).toHaveBeenCalledTimes(1);
  });
});
