import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGoogleAdsConversionSendTo, getGoogleAdsId } from './google-ads';

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

describe('getGoogleAdsConversionSendTo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('kimlik ve etiketten AW-.../label üretir', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', 'AW-18584346333');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL', 'j_t-CNzh_LsdEN292p1F');
    expect(getGoogleAdsConversionSendTo()).toBe(
      'AW-18584346333/j_t-CNzh_LsdEN292p1F'
    );
  });

  it('etiketin boşluklarını temizler', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', 'AW-18584346333');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL', '  j_t-CNzh_LsdEN292p1F  ');
    expect(getGoogleAdsConversionSendTo()).toBe(
      'AW-18584346333/j_t-CNzh_LsdEN292p1F'
    );
  });

  it('etiket yoksa dönüşüm hedefi üretmez', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', 'AW-18584346333');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL', '');
    expect(getGoogleAdsConversionSendTo()).toBeUndefined();
  });

  it('kimlik yoksa dönüşüm hedefi üretmez', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', '');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL', 'j_t-CNzh_LsdEN292p1F');
    expect(getGoogleAdsConversionSendTo()).toBeUndefined();
  });

  it('geçersiz etiket biçimini yok sayar', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', 'AW-18584346333');
    for (const label of ['abc', 'has space', 'label!', 'ç-ğ']) {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL', label);
      expect(getGoogleAdsConversionSendTo()).toBeUndefined();
    }
  });
});
