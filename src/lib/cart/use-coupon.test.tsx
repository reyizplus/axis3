// @vitest-environment jsdom
/**
 * Uygulanmış kuponun checkout'ta doğrulanması.
 *
 * Kilitlenen davranış: localStorage'dan gelen kupon, kullanıcı "Siparişi
 * Tamamla"ya basmadan önce sunucuda doğrulanır. Geçersizse kupon kaldırılır ve
 * sebep gösterilir; ağ hatasında ise kupon korunur (sepet sessizce pahalılaşmaz).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useCoupon } from './use-coupon';
import { setAppliedCoupon } from './coupon-store';

const TOTALS = { itemsSubtotal: 334.21, serviceSubtotal: 334.21, storeSubtotal: 0 };

function mockFetchResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('useCoupon — checkout öncesi doğrulama', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('axis3_cart_user', 'user-1');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('geçersiz kuponu göndermeden önce kaldırır ve sebebini gösterir', async () => {
    setAppliedCoupon({
      code: 'HOSGELDIN',
      discountType: 'percentage',
      discountAmount: 33.42,
      freeShipping: false,
      description: null,
    });
    const fetchMock = mockFetchResponse(
      { valid: false, reason: 'first_order_only', error: 'Bu kupon yalnızca ilk siparişinizde geçerli' },
      409
    );

    const { result } = renderHook(() => useCoupon(TOTALS));

    // Doğrulama bitmeden sipariş gönderilemez.
    await waitFor(() => expect(result.current.isChecking).toBe(true));

    await waitFor(() => expect(result.current.coupon).toBeNull());
    expect(result.current.removedNotice).toContain('yalnızca ilk siparişinizde geçerli');
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ağ/oturum hatasında kuponu korur ve hata gösterir', async () => {
    setAppliedCoupon({
      code: 'INDIRIM10',
      discountType: 'percentage',
      discountAmount: 33.42,
      freeShipping: false,
      description: null,
    });
    mockFetchResponse({ valid: false, error: 'Çok fazla deneme. Lütfen kısa bir süre sonra tekrar deneyin.' }, 429);

    const { result } = renderHook(() => useCoupon(TOTALS));

    await waitFor(() => expect(result.current.error).toContain('Çok fazla deneme'));
    expect(result.current.coupon?.code).toBe('INDIRIM10');
    expect(result.current.removedNotice).toBeNull();
  });

  it('geçerli kuponu korur ve tutarı tazeler', async () => {
    setAppliedCoupon({
      code: 'INDIRIM10',
      discountType: 'percentage',
      discountAmount: 10,
      freeShipping: false,
      description: null,
    });
    mockFetchResponse({
      valid: true,
      code: 'INDIRIM10',
      discountType: 'percentage',
      discountAmount: 33.42,
      freeShipping: false,
    });

    const { result } = renderHook(() => useCoupon(TOTALS));

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    await waitFor(() => expect(result.current.coupon?.discountAmount).toBe(33.42));
    expect(result.current.error).toBeNull();
    expect(result.current.removedNotice).toBeNull();
  });

  it('kupon yoksa istek atmaz', async () => {
    const fetchMock = mockFetchResponse({ valid: true });

    const { result } = renderHook(() => useCoupon(TOTALS));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isChecking).toBe(false);
  });
});
