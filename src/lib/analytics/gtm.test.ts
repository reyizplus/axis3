import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGtmContainerId } from './gtm';

/**
 * Geçersiz bir kapsayıcı kimliği tarayıcıda bozuk bir `gtm.js` isteğine ve
 * konsolda 404'e yol açar; bu yüzden kimlik yüklenmeden önce doğrulanır.
 */
describe('getGtmContainerId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('geçerli bir GTM kimliğini döndürür', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID', 'GTM-5RZ8K9');
    expect(getGtmContainerId()).toBe('GTM-5RZ8K9');
  });

  it('boşlukları temizler ve küçük harfi büyüğe çevirir', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID', '  gtm-ab12cd  ');
    expect(getGtmContainerId()).toBe('GTM-AB12CD');
  });

  it('boş değeri yok sayar', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID', '');
    expect(getGtmContainerId()).toBeUndefined();
  });

  it('placeholder ve yanlış biçimli değerleri yok sayar', () => {
    for (const value of ['GTM-XXXXXXX', 'AW-123456789', 'GTM-', 'gtm.js?id=GTM-ABC123']) {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID', value);
      expect(getGtmContainerId()).toBeUndefined();
    }
  });
});
