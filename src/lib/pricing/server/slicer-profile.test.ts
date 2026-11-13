import { describe, expect, it } from 'vitest';
import {
  MATERIAL_TEMPERATURES,
  SLICE_PROFILE_VERSION,
  buildSlicerProfile,
  normalizeMaterialType,
  profileHash,
  stableStringify,
} from './slicer-profile';
import type { SliceProfileInput, SliceProfileV1 } from './slicer-profile';

/**
 * Bu testler dilimleme profilinin fiyat kimliğini kilitler.
 *
 * Profil hash'i G-Code önbelleğinin anahtarıdır: aynı seçimler aynı hash'i,
 * farklı bir seçim ise mutlaka farklı bir hash'i üretmelidir. Aksi halde eski
 * bir dilimleme sonucu yeni seçimlerle eşleşir ve müşteriye yanlış fiyat
 * gösterilir.
 */

const BASE: SliceProfileInput = {
  technology: 'FDM',
  layerHeight: 0.2,
  infillPercentage: 20,
  printSpeed: 60,
  nozzleMm: 0.4,
  materialType: 'PLA',
  materialDensity: 1.24,
  supportEnabled: false,
};

function profile(overrides: Partial<SliceProfileInput> = {}): SliceProfileV1 {
  const built = buildSlicerProfile({ ...BASE, ...overrides });
  if (!built) throw new Error('Test profili oluşturulamadı');
  return built;
}

describe('buildSlicerProfile', () => {
  it('FDM girdisini sürümlü profile çevirir', () => {
    const built = profile();

    expect(built.v).toBe(SLICE_PROFILE_VERSION);
    expect(built.engine).toBe('prusaslicer-2.5.0');
    expect(built.filamentDiameter).toBe(1.75);
    expect(built.layerHeight).toBe(0.2);
    expect(built.infillPercentage).toBe(20);
    expect(built.printSpeed).toBe(60);
    expect(built.nozzleMm).toBe(0.4);
    expect(built.materialType).toBe('PLA');
    expect(built.materialDensity).toBe(1.24);
    expect(built.nozzleTemp).toBe(210);
    expect(built.bedTemp).toBe(60);
    expect(built.supportEnabled).toBe(false);
  });

  it('SLA için null döner (reçine hacim tahmininde kalır)', () => {
    expect(buildSlicerProfile({ ...BASE, technology: 'SLA' })).toBeNull();
  });

  it('geçersiz sayısal değerleri uydurmaz, null döner', () => {
    expect(buildSlicerProfile({ ...BASE, layerHeight: NaN })).toBeNull();
    expect(buildSlicerProfile({ ...BASE, layerHeight: 0 })).toBeNull();
    expect(buildSlicerProfile({ ...BASE, layerHeight: -0.2 })).toBeNull();
    expect(buildSlicerProfile({ ...BASE, infillPercentage: NaN })).toBeNull();
    expect(buildSlicerProfile({ ...BASE, printSpeed: 0 })).toBeNull();
    expect(buildSlicerProfile({ ...BASE, nozzleMm: -0.4 })).toBeNull();
    expect(buildSlicerProfile({ ...BASE, materialDensity: NaN })).toBeNull();
  });

  it('sıcaklık tablosunu tek kaynaktan uygular', () => {
    expect(MATERIAL_TEMPERATURES.PLA).toEqual({ nozzleTemp: 210, bedTemp: 60 });
    expect(MATERIAL_TEMPERATURES.ABS).toEqual({ nozzleTemp: 240, bedTemp: 100 });
    expect(MATERIAL_TEMPERATURES.PETG).toEqual({ nozzleTemp: 240, bedTemp: 80 });
    expect(MATERIAL_TEMPERATURES.TPU).toEqual({ nozzleTemp: 225, bedTemp: 50 });
    expect(MATERIAL_TEMPERATURES.ASA).toEqual({ nozzleTemp: 250, bedTemp: 100 });

    expect(profile({ materialType: 'ABS' }).nozzleTemp).toBe(240);
    expect(profile({ materialType: 'ABS' }).bedTemp).toBe(100);
  });

  it('bilinmeyen malzemede PLA sıcaklıklarına düşer', () => {
    const built = profile({ materialType: 'KARBON-FIBER-X' });

    expect(built.nozzleTemp).toBe(210);
    expect(built.bedTemp).toBe(60);
  });

  // Veritabanındaki malzeme adları kısa kod değil, uzun addır. Bu eşleme
  // yapılmazsa ABS/TPU/ASA sessizce PLA sıcaklığıyla dilimleniyordu.
  it('uzun malzeme adlarından kanonik türü çıkarır', () => {
    const cases: Array<[string, string, number, number]> = [
      ['PLA (Polylactic Acid)', 'PLA', 210, 60],
      ['ABS (Acrylonitrile Butadiene Styrene)', 'ABS', 240, 100],
      ['PETG (Polyethylene Terephthalate Glycol)', 'PETG', 240, 80],
      ['TPU (Thermoplastic Polyurethane)', 'TPU', 225, 50],
      ['ASA (Acrylonitrile Styrene Acrylate)', 'ASA', 250, 100],
    ];

    for (const [name, type, nozzleTemp, bedTemp] of cases) {
      const built = profile({ materialType: name });
      expect(built.materialType).toBe(type);
      expect(built.nozzleTemp).toBe(nozzleTemp);
      expect(built.bedTemp).toBe(bedTemp);
    }
  });

  it('uzun ad ile kısa kod aynı hash üretir (önbellek paritesi)', () => {
    expect(profileHash(profile({ materialType: 'ABS (Acrylonitrile Butadiene Styrene)' }))).toBe(
      profileHash(profile({ materialType: 'ABS' }))
    );
  });

  it('"POLYLACTIC" içindeki "PLA"yı malzeme türü sanmaz', () => {
    expect(normalizeMaterialType('POLYLACTIC-X')).toBe('POLYLACTIC-X');
  });
});

describe('profileHash', () => {
  it('aynı girdi her zaman aynı hash üretir', () => {
    const hashes = Array.from({ length: 10 }, () => profileHash(profile()));

    expect(new Set(hashes).size).toBe(1);
  });

  it('32 karakterlik küçük harf hex üretir (DB unique index uyumu)', () => {
    expect(profileHash(profile())).toMatch(/^[0-9a-f]{32}$/);
  });

  it('katman yüksekliği değişince hash değişir', () => {
    expect(profileHash(profile({ layerHeight: 0.2 }))).not.toBe(
      profileHash(profile({ layerHeight: 0.1 }))
    );
  });

  it('doluluk, nozul ve malzeme kimliği hash i değiştirir', () => {
    const base = profileHash(profile());

    expect(profileHash(profile({ infillPercentage: 50 }))).not.toBe(base);
    expect(profileHash(profile({ nozzleMm: 0.6 }))).not.toBe(base);
    expect(profileHash(profile({ materialType: 'PETG' }))).not.toBe(base);
  });

  it('malzeme yoğunluğu ve destek ayarı hash i değiştirir', () => {
    const base = profileHash(profile());

    expect(profileHash(profile({ materialDensity: 1.27 }))).not.toBe(base);
    expect(profileHash(profile({ supportEnabled: true }))).not.toBe(base);
  });

  it('yazdırma hızı hash i değiştirir', () => {
    expect(profileHash(profile({ printSpeed: 60 }))).not.toBe(
      profileHash(profile({ printSpeed: 90 }))
    );
  });

  it('kozmetik kayan nokta gürültüsü hash i değiştirmez', () => {
    // Yuvarlama olmasaydı 0.2 + 4e-11 farklı bir hash üretirdi.
    expect(profileHash(profile({ layerHeight: 0.2 }))).toBe(
      profileHash(profile({ layerHeight: 0.20000000004 }))
    );
    expect(profileHash(profile({ printSpeed: 60.04 }))).toBe(
      profileHash(profile({ printSpeed: 60 }))
    );
    expect(profileHash(profile({ materialDensity: 1.2400000001 }))).toBe(
      profileHash(profile({ materialDensity: 1.24 }))
    );
  });
});

describe('stableStringify', () => {
  it('anahtar sırası farklı ama değerler aynı nesnede aynı hash üretir', () => {
    const first = profile();
    const reordered: SliceProfileV1 = {
      supportEnabled: first.supportEnabled,
      bedTemp: first.bedTemp,
      nozzleTemp: first.nozzleTemp,
      materialDensity: first.materialDensity,
      materialType: first.materialType,
      filamentDiameter: first.filamentDiameter,
      nozzleMm: first.nozzleMm,
      printSpeed: first.printSpeed,
      infillPercentage: first.infillPercentage,
      layerHeight: first.layerHeight,
      engine: first.engine,
      v: first.v,
    };

    expect(stableStringify(reordered)).toBe(stableStringify(first));
    expect(profileHash(reordered)).toBe(profileHash(first));
  });

  it('iç içe nesnelerin anahtarlarını da sıralar', () => {
    const a = { z: 1, a: { y: 2, b: 3 }, list: [{ d: 4, c: 5 }] };
    const b = { list: [{ c: 5, d: 4 }], a: { b: 3, y: 2 }, z: 1 };

    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(stableStringify(a)).toBe('{"a":{"b":3,"y":2},"list":[{"c":5,"d":4}],"z":1}');
  });
});
