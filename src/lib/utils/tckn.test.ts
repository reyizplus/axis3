import { describe, expect, it } from 'vitest';
import { isValidTurkishId } from './tckn';

describe('isValidTurkishId', () => {
  it('accepts a valid TCKN', () => {
    // 10000000146 satisfies both official checksums.
    expect(isValidTurkishId('10000000146')).toBe(true);
  });

  it('rejects the old hardcoded placeholder', () => {
    // This is what the payment service used for every customer before.
    expect(isValidTurkishId('11111111111')).toBe(false);
  });

  it('rejects wrong length or leading zero', () => {
    expect(isValidTurkishId('')).toBe(false);
    expect(isValidTurkishId(null)).toBe(false);
    expect(isValidTurkishId('1234567890')).toBe(false);
    expect(isValidTurkishId('123456789012')).toBe(false);
    expect(isValidTurkishId('01234567890')).toBe(false);
  });

  it('rejects non-digits', () => {
    expect(isValidTurkishId('12345abcde6')).toBe(false);
    expect(isValidTurkishId(' 10000000146')).toBe(true); // trimmed
  });

  it('rejects a number with a broken first checksum', () => {
    expect(isValidTurkishId('10000000156')).toBe(false);
  });

  it('rejects a number with a broken second checksum', () => {
    expect(isValidTurkishId('10000000147')).toBe(false);
  });
});
