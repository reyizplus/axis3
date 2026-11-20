import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGoogleAdsId } from './google-ads';

describe('getGoogleAdsId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('geçerli bir Google Ads kimliğini döndürür', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', 'AW-18584346333');
    expect(getGoogleAdsId()).toBe('AW-18584346333');
  });

  it('boşlukları temizler ve küçük harfi büyüğe çevirir', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', '  aw-18584346333  ');
    expect(getGoogleAdsId()).toBe('AW-18584346333');
  });

  it('boş değeri yok sayar', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', '');
    expect(getGoogleAdsId()).toBeUndefined();
  });

  it('placeholder ve yanlış biçimli değerleri yok sayar', () => {
    for (const value of ['AW-XXXXXXXXXX', 'AW-', 'GTM-5RZ8K9', 'AW12']) {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', value);
      expect(getGoogleAdsId()).toBeUndefined();
    }
  });
});
