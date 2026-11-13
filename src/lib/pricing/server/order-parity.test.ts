/**
 * Parite testleri: önizleme (rota) ile sipariş (createOrder) AYNI profil
 * hash'ini üretmek zorunda. Ayrışırsa önbellek ıskalar ve müşterinin gördüğü
 * fiyat ile sunucunun hesapladığı fiyat sessizce farklılaşır.
 *
 * Not: Bu testler `order-creation-service`'i import etmez; onun kullandığı
 * paylaşılan çözümleyiciyi (`resolveSliceSelection`) doğrudan çalıştırır.
 * Böylece Next.js sunucu bağımlılıkları test ortamına sızmaz.
 */

import { describe, expect, it } from 'vitest';

import {
  resolveSliceSelection,
  speedMultiplierFromTimeMultiplier,
  type SliceSelectionInput,
} from './resolve-slice-selection';
import { profileHash, type SliceProfileV1 } from './slicer-profile';

const PLA = {
  id: 'mat-pla',
  name: 'PLA',
  technology: 'FDM',
  density: 1.24,
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

function createFakeClient(rows: {
  materials?: Record<string, unknown> | null;
  print_settings?: Record<string, unknown> | null;
}) {
  return {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: rows[table as keyof typeof rows] ?? null,
          error: null,
        }),
      };
      return builder;
    },
  };
}

async function hashFor(
  rows: Parameters<typeof createFakeClient>[0],
  input: SliceSelectionInput
): Promise<string | null> {
  const result = await resolveSliceSelection(createFakeClient(rows), input);
  return result.profile ? profileHash(result.profile as SliceProfileV1) : null;
}

describe('önizleme ↔ sipariş paritesi', () => {
  const rows = { materials: PLA, print_settings: HIGH_QUALITY };

  it('kalite seçiminde iki taraf da aynı hash üretir', async () => {
    const routeInput: SliceSelectionInput = {
      materialId: 'mat-pla',
      printSettingId: 'ps-hq',
      nozzleSizeMm: 0.4,
    };
    // Sipariş servisi aynı alanları kendi item modelinden doldurur.
    const orderInput: SliceSelectionInput = {
      materialId: 'mat-pla',
      printSettingId: 'ps-hq',
      nozzleSizeMm: 0.4,
      custom: null,
    };

    expect(await hashFor(rows, routeInput)).toBe(await hashFor(rows, orderInput));
  });

  it('özel modda hız çarpanı tersine çevrilerek aynı hash elde edilir', async () => {
    // İstemci: hız 2x → timeMultiplier 0.5
    const orderInput: SliceSelectionInput = {
      materialId: 'mat-pla',
      printSettingId: 'custom',
      nozzleSizeMm: 0.4,
      custom: {
        layerHeight: 0.15,
        infillPercentage: 40,
        speedMultiplier: speedMultiplierFromTimeMultiplier(0.5),
      },
    };
    const routeInput: SliceSelectionInput = {
      materialId: 'mat-pla',
      printSettingId: 'custom',
      nozzleSizeMm: 0.4,
      custom: {
        layerHeight: 0.15,
        infillPercentage: 40,
        speedMultiplier: 2,
      },
    };

    expect(speedMultiplierFromTimeMultiplier(0.5)).toBe(2);
    expect(await hashFor(rows, routeInput)).toBe(await hashFor(rows, orderInput));
  });

  it('farklı doluluk farklı hash üretir (eski analiz kullanılamaz)', async () => {
    const base: SliceSelectionInput = {
      materialId: 'mat-pla',
      printSettingId: 'custom',
      nozzleSizeMm: 0.4,
      custom: { infillPercentage: 20 },
    };
    const denser: SliceSelectionInput = {
      ...base,
      custom: { infillPercentage: 50 },
    };

    const a = await hashFor(rows, base);
    const b = await hashFor(rows, denser);

    expect(a).not.toBeNull();
    expect(a).not.toBe(b);
  });

  it('farklı katman yüksekliği farklı hash üretir', async () => {
    const base: SliceSelectionInput = {
      materialId: 'mat-pla',
      printSettingId: 'custom',
      custom: { layerHeight: 0.2 },
    };
    const fine: SliceSelectionInput = {
      ...base,
      custom: { layerHeight: 0.1 },
    };

    expect(await hashFor(rows, base)).not.toBe(await hashFor(rows, fine));
  });

  it('SLA için iki taraf da dilimleme yapmaz', async () => {
    const resinRows = {
      materials: { ...PLA, technology: 'SLA', name: 'Standart Reçine', density: 1.15 },
      print_settings: HIGH_QUALITY,
    };

    expect(
      await hashFor(resinRows, { materialId: 'mat-pla', printSettingId: 'ps-hq' })
    ).toBeNull();
  });
});

describe('speedMultiplierFromTimeMultiplier', () => {
  it('geçersiz değerlerde 1 döner', () => {
    expect(speedMultiplierFromTimeMultiplier(0)).toBe(1);
    expect(speedMultiplierFromTimeMultiplier(-1)).toBe(1);
    expect(speedMultiplierFromTimeMultiplier(Number.NaN)).toBe(1);
    expect(speedMultiplierFromTimeMultiplier(null)).toBe(1);
    expect(speedMultiplierFromTimeMultiplier(undefined)).toBe(1);
  });

  it('geçerli değeri ters çevirir', () => {
    expect(speedMultiplierFromTimeMultiplier(1)).toBe(1);
    expect(speedMultiplierFromTimeMultiplier(2)).toBe(0.5);
  });
});
