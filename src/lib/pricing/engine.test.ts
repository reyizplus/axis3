import { afterEach, describe, expect, it } from 'vitest';

import { isSlicingEnabled, selectGcodeSource } from './engine';

const HASH = 'a'.repeat(32);

describe('selectGcodeSource', () => {
  const fdm = {
    useGCodeAnalysis: true,
    slicingEnabled: true,
    technology: 'FDM' as const,
    slicerProfileHash: HASH,
  };

  it('hash varsa önbellek sorgusuna izin verir', () => {
    expect(selectGcodeSource(fdm)).toEqual({
      shouldQuery: true,
      profileHash: HASH,
      warning: null,
    });
  });

  it('hash yoksa sorgu yapmaz ve uyarı üretir', () => {
    const result = selectGcodeSource({ ...fdm, slicerProfileHash: undefined });
    expect(result.shouldQuery).toBe(false);
    expect(result.warning).toBe('gcode_profile_missing');
  });

  it('boşluktan oluşan hash geçersizdir', () => {
    const result = selectGcodeSource({ ...fdm, slicerProfileHash: '   ' });
    expect(result.shouldQuery).toBe(false);
    expect(result.warning).toBe('gcode_profile_missing');
  });

  it('hash çevresindeki boşluğu temizler', () => {
    const result = selectGcodeSource({ ...fdm, slicerProfileHash: `  ${HASH}  ` });
    expect(result.profileHash).toBe(HASH);
  });

  it('useGCodeAnalysis kapalıysa sorgu yapmaz', () => {
    expect(selectGcodeSource({ ...fdm, useGCodeAnalysis: false })).toEqual({
      shouldQuery: false,
      profileHash: null,
      warning: null,
    });
  });

  it('kill switch kapalıysa sorgu yapmaz', () => {
    expect(selectGcodeSource({ ...fdm, slicingEnabled: false })).toEqual({
      shouldQuery: false,
      profileHash: null,
      warning: null,
    });
  });

  it('SLA için dilimleme denenmez ve uyarı üretmez', () => {
    expect(selectGcodeSource({ ...fdm, technology: 'SLA' })).toEqual({
      shouldQuery: false,
      profileHash: null,
      warning: null,
    });
  });
});

describe('isSlicingEnabled', () => {
  const original = process.env.SLICING_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.SLICING_ENABLED;
    else process.env.SLICING_ENABLED = original;
  });

  it('tanımsızsa açıktır', () => {
    delete process.env.SLICING_ENABLED;
    expect(isSlicingEnabled()).toBe(true);
  });

  it("yalnızca 'false' değerinde kapanır", () => {
    process.env.SLICING_ENABLED = 'false';
    expect(isSlicingEnabled()).toBe(false);
  });

  it("'true' değerinde açıktır", () => {
    process.env.SLICING_ENABLED = 'true';
    expect(isSlicingEnabled()).toBe(true);
  });
});
