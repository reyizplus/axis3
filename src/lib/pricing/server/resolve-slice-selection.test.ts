import { describe, expect, it } from 'vitest';

import {
  resolveSliceSelection,
  SliceSelectionError,
  type SliceSelectionInput,
} from './resolve-slice-selection';
import { profileHash } from './slicer-profile';

interface FixtureRows {
  materials?: Record<string, unknown> | null;
  print_settings?: Record<string, unknown> | null;
}

function createFakeClient(rows: FixtureRows) {
  const queried: string[] = [];

  const client = {
    from(table: string) {
      queried.push(table);
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: rows[table as keyof FixtureRows] ?? null,
          error: null,
        }),
      };
      return builder;
    },
  };

  return { client, queried };
}

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

const HIGH_QUALITY = {
  id: 'ps-hq',
  name: 'Yüksek Kalite',
  technology: 'FDM',
  layer_height: 0.1,
  infill_percentage: 30,
  print_speed: 40,
  is_active: true,
};

const baseInput: SliceSelectionInput = {
  materialId: 'mat-pla',
  printSettingId: 'ps-hq',
  nozzleSizeMm: 0.4,
};

describe('resolveSliceSelection', () => {
  it('kalite ayarlarını DB değerlerinden profile çevirir', async () => {
    const { client } = createFakeClient({ materials: PLA, print_settings: HIGH_QUALITY });

    const result = await resolveSliceSelection(client, baseInput);

    expect(result.technology).toBe('FDM');
    expect(result.skipReason).toBeNull();
    expect(result.profile).toMatchObject({
      v: 1,
      layerHeight: 0.1,
      infillPercentage: 30,
      printSpeed: 40,
      nozzleMm: 0.4,
      materialDensity: 1.24,
      materialType: 'PLA',
      nozzleTemp: 210,
      bedTemp: 60,
    });
  });

  it('aynı seçimler aynı hash üretir (parite temeli)', async () => {
    const { client } = createFakeClient({ materials: PLA, print_settings: HIGH_QUALITY });

    const first = await resolveSliceSelection(client, baseInput);
    const second = await resolveSliceSelection(client, baseInput);

    expect(profileHash(first.profile!)).toBe(profileHash(second.profile!));
  });

  it('SLA malzemede dilimleme yapmaz, sebep bildirir', async () => {
    const { client, queried } = createFakeClient({ materials: RESIN });

    const result = await resolveSliceSelection(client, {
      materialId: 'mat-resin',
      printSettingId: 'ps-hq',
    });

    expect(result).toEqual({ technology: 'SLA', profile: null, skipReason: 'sla' });
    // SLA'da kalite tablosu hiç okunmamalı: gereksiz sorgu ve yanlış eşleşme riski yok.
    expect(queried).toEqual(['materials']);
  });

  it('özel modda varsayılanlar uygulanır', async () => {
    const { client } = createFakeClient({ materials: PLA });

    const result = await resolveSliceSelection(client, {
      materialId: 'mat-pla',
      printSettingId: 'custom',
    });

    expect(result.profile).toMatchObject({
      layerHeight: 0.2,
      infillPercentage: 20,
      printSpeed: 60,
      supportEnabled: true,
    });
  });

  it('hız çarpanını mm/s hızına çevirir', async () => {
    const { client } = createFakeClient({ materials: PLA });

    const result = await resolveSliceSelection(client, {
      materialId: 'mat-pla',
      printSettingId: 'custom',
      custom: { speedMultiplier: 2 },
    });

    expect(result.profile?.printSpeed).toBe(120);
  });

  it('özel modda aralık dışı doluluğu reddeder', async () => {
    const { client } = createFakeClient({ materials: PLA });

    await expect(
      resolveSliceSelection(client, {
        materialId: 'mat-pla',
        printSettingId: 'custom',
        custom: { infillPercentage: 0 },
      })
    ).rejects.toBeInstanceOf(SliceSelectionError);
  });

  it('pasif malzemeyi reddeder', async () => {
    const { client } = createFakeClient({
      materials: { ...PLA, is_active: false },
      print_settings: HIGH_QUALITY,
    });

    await expect(resolveSliceSelection(client, baseInput)).rejects.toThrow(/artık mevcut değil/);
  });

  it('kalite ile malzeme teknolojisi uyuşmazsa reddeder', async () => {
    const { client } = createFakeClient({
      materials: PLA,
      print_settings: { ...HIGH_QUALITY, technology: 'SLA' },
    });

    await expect(resolveSliceSelection(client, baseInput)).rejects.toThrow(/uyumlu değil/);
  });

  it('yoğunluğu tanımsız malzemeyi reddeder', async () => {
    const { client } = createFakeClient({
      materials: { ...PLA, density: null },
      print_settings: HIGH_QUALITY,
    });

    await expect(resolveSliceSelection(client, baseInput)).rejects.toThrow(/yoğunluğu/);
  });

  it('bulunamayan kaliteyi reddeder', async () => {
    const { client } = createFakeClient({ materials: PLA, print_settings: null });

    await expect(resolveSliceSelection(client, baseInput)).rejects.toThrow(/bulunamadı/);
  });

  it('malzeme seçilmeden çağrılırsa reddeder', async () => {
    const { client } = createFakeClient({});

    await expect(
      resolveSliceSelection(client, { materialId: '' })
    ).rejects.toThrow(/Malzeme seçilmedi/);
  });
});
