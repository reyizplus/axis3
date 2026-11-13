import { describe, it, expect } from 'vitest';

import {
  getCachedAnalysis,
  saveAnalysis,
  type AnalysisCacheClient,
} from './analysis-cache';

interface FakeOptions {
  data?: unknown;
  error?: unknown;
  upsertError?: unknown;
}

interface FakeCalls {
  fromCalls: string[];
  eqCalls: Array<[string, unknown]>;
  upsert: { row: Record<string, unknown>; options?: { onConflict?: string } } | null;
}

function createFakeClient(options: FakeOptions = {}) {
  const calls: FakeCalls = { fromCalls: [], eqCalls: [], upsert: null };

  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      calls.eqCalls.push([column, value]);
      return builder;
    },
    limit: () => builder,
    maybeSingle: async () => ({
      data: options.data ?? null,
      error: options.error ?? null,
    }),
    upsert: async (row: Record<string, unknown>, upsertOptions?: { onConflict?: string }) => {
      calls.upsert = { row, options: upsertOptions };
      return { error: options.upsertError ?? null };
    },
  };

  const client: AnalysisCacheClient = {
    from: (table: string) => {
      calls.fromCalls.push(table);
      return builder as never;
    },
  };

  return { client, calls };
}

const FILE_ID = '11111111-1111-4111-8111-111111111111';
const HASH = 'a'.repeat(32);

describe('getCachedAnalysis', () => {
  it('eşleşen satırı fiyatlamaya hazır hale getirir', async () => {
    const { client, calls } = createFakeClient({
      data: {
        filament_weight_grams: '4.4900',
        actual_print_time_seconds: 1151,
        actual_print_time_hours: '0.32',
        total_layer_count: 100,
        filament_length_mm: '1504.88',
        raw_header: { source: 'prusaslicer' },
        profile_hash: HASH,
        engine: 'prusaslicer-2.5.0',
      },
    });

    const result = await getCachedAnalysis(client, FILE_ID, HASH);

    expect(result).toEqual({
      grams: 4.49,
      printSeconds: 1151,
      layerCount: 100,
      filamentMm: 1504.88,
      profileHash: HASH,
      engine: 'prusaslicer-2.5.0',
    });
    expect(calls.fromCalls).toEqual(['gcode_analysis_results']);
    expect(calls.eqCalls).toEqual([
      ['file_id', FILE_ID],
      ['profile_hash', HASH],
    ]);
  });

  it('hash boşsa sorgu bile yapmaz', async () => {
    const { client, calls } = createFakeClient({ data: null });

    expect(await getCachedAnalysis(client, FILE_ID, '')).toBeNull();
    expect(calls.fromCalls).toEqual([]);
  });

  it('sorgu hatasında null döner', async () => {
    const { client } = createFakeClient({ error: { message: 'boom' } });
    expect(await getCachedAnalysis(client, FILE_ID, HASH)).toBeNull();
  });

  it('simüle edilmiş satırı reddeder', async () => {
    const { client } = createFakeClient({
      data: {
        filament_weight_grams: 12,
        actual_print_time_seconds: 3600,
        total_layer_count: 50,
        filament_length_mm: 4000,
        raw_header: { note: 'AXIS3 SIMULATED G-CODE' },
        profile_hash: HASH,
      },
    });

    expect(await getCachedAnalysis(client, FILE_ID, HASH)).toBeNull();
  });

  it('gram 0 ise fiyatlamaya sokmaz', async () => {
    const { client } = createFakeClient({
      data: {
        filament_weight_grams: 0,
        actual_print_time_seconds: 900,
        total_layer_count: 10,
        filament_length_mm: 0,
        raw_header: null,
        profile_hash: HASH,
      },
    });

    expect(await getCachedAnalysis(client, FILE_ID, HASH)).toBeNull();
  });

  it('süre saniye kolonunda yoksa saatten türetir', async () => {
    const { client } = createFakeClient({
      data: {
        filament_weight_grams: 8,
        actual_print_time_seconds: null,
        actual_print_time_hours: '1.5',
        total_layer_count: 75,
        filament_length_mm: 2700,
        raw_header: null,
        profile_hash: HASH,
      },
    });

    const result = await getCachedAnalysis(client, FILE_ID, HASH);
    expect(result?.printSeconds).toBe(5400);
  });

  it('farklı profile_hash taşıyan satırı kabul etmez', async () => {
    const { client } = createFakeClient({
      data: {
        filament_weight_grams: 4.49,
        actual_print_time_seconds: 1151,
        total_layer_count: 100,
        filament_length_mm: 1504.88,
        raw_header: null,
        profile_hash: 'b'.repeat(32),
      },
    });

    expect(await getCachedAnalysis(client, FILE_ID, HASH)).toBeNull();
  });
});

describe('saveAnalysis', () => {
  it('(file_id, profile_hash) çakışmasında güncelleyecek şekilde yazar', async () => {
    const { client, calls } = createFakeClient();

    await saveAnalysis(client, {
      fileId: FILE_ID,
      profileHash: HASH,
      profileJson: { v: 1, layerHeight: 0.2 },
      stats: {
        grams: 4.4901,
        printSeconds: 1151,
        layerCount: 100,
        filamentMm: 1504.879,
        durationMs: 1830.4,
        engine: 'prusaslicer-2.5.0',
      },
    });

    expect(calls.upsert?.options).toEqual({ onConflict: 'file_id,profile_hash' });
    expect(calls.upsert?.row).toMatchObject({
      file_id: FILE_ID,
      profile_hash: HASH,
      profile_json: { v: 1, layerHeight: 0.2 },
      filament_weight_grams: 4.4901,
      support_weight_grams: 0,
      actual_print_time_seconds: 1151,
      actual_print_time_hours: 0.32,
      total_layer_count: 100,
      engine: 'prusaslicer-2.5.0',
      duration_ms: 1830,
    });
    expect(calls.upsert?.row.raw_header).toMatchObject({
      source: 'prusaslicer',
      profileHash: HASH,
    });
  });

  it('geçersiz dilimleme sonucunu yazmaz', async () => {
    const { client, calls } = createFakeClient();

    await expect(
      saveAnalysis(client, {
        fileId: FILE_ID,
        profileHash: HASH,
        profileJson: {},
        stats: { grams: 0, printSeconds: 0, layerCount: 0 },
      })
    ).rejects.toThrow(/geçersiz dilimleme sonucu/);

    expect(calls.upsert).toBeNull();
  });

  it('hash olmadan yazmaz', async () => {
    const { client } = createFakeClient();

    await expect(
      saveAnalysis(client, {
        fileId: FILE_ID,
        profileHash: '',
        profileJson: {},
        stats: { grams: 5, printSeconds: 100, layerCount: 10 },
      })
    ).rejects.toThrow(/profileHash zorunlu/);
  });

  it('veritabanı hatasını yükseltir', async () => {
    const { client } = createFakeClient({ upsertError: { message: 'duplicate key' } });

    await expect(
      saveAnalysis(client, {
        fileId: FILE_ID,
        profileHash: HASH,
        profileJson: {},
        stats: { grams: 5, printSeconds: 100, layerCount: 10 },
      })
    ).rejects.toThrow(/analiz kaydedilemedi \(duplicate key\)/);
  });
});
