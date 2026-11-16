// @vitest-environment jsdom
/**
 * Sepetin sunucu fiyatlarıyla eşitlenmesi.
 *
 * `POST /api/v1/orders/create` fiyat sapmasında `409 price_changed` döner.
 * İstemci bu yanıttaki fiyatları sepete yazmazsa müşteri her denemede aynı
 * hatayı alır (sipariş hiç oluşmaz). Bu testler o kurtarma yolunu kilitler.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    throw new Error('supabase yok (birim testi)');
  },
}));

import { cartService } from './cart-service';
import { applyStoreItemPrices, getStoreItems } from './store-cart';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CART_KEY = `axis3_cart_${USER_ID}`;

function seedCart() {
  localStorage.setItem('axis3_cart_user', USER_ID);
  localStorage.setItem(
    CART_KEY,
    JSON.stringify({
      userId: USER_ID,
      items: [
        {
          id: 'cart_1',
          fileId: 'file-1',
          fileName: 'radyo.stl',
          volumeCm3: 661.07,
          materialId: 'mat-pla',
          materialName: 'PLA (Polylactic Acid)',
          printSettingId: 'ps-hizli',
          printSettingName: 'Hızlı Baskı',
          quantity: 1,
          unitPrice: 450.32,
          totalPrice: 450.32,
          estimatedTime: 12,
          supportEnabled: true,
          isPreorder: false,
          addedAt: new Date('2026-11-01T00:00:00Z').toISOString(),
        },
        {
          id: 'cart_2',
          fileId: 'file-2',
          fileName: 'kapak.stl',
          volumeCm3: 16.79,
          materialId: 'mat-abs',
          materialName: 'ABS',
          printSettingId: 'ps-hizli',
          printSettingName: 'Hızlı Baskı',
          quantity: 2,
          unitPrice: 55.83,
          totalPrice: 111.66,
          estimatedTime: 1,
          supportEnabled: true,
          isPreorder: true,
          preorderDiscountPercent: 10,
          addedAt: new Date('2026-11-01T00:00:00Z').toISOString(),
        },
      ],
      totalPrice: 561.98,
      totalItems: 3,
      updatedAt: new Date('2026-11-01T00:00:00Z').toISOString(),
      version: 7,
    })
  );
}

function readCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '{}');
}

describe('cartService.applyServerPrices', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    seedCart();
  });

  it('sunucunun fiyatlarını sepete yazar', async () => {
    const applied = await cartService.applyServerPrices([
      { index: 0, unitPrice: 512.4, totalPrice: 512.4, supportEnabled: false },
      { index: 1, unitPrice: 39.28, totalPrice: 78.56, isPreorder: false },
    ]);

    expect(applied).toBe(true);

    const cart = readCart();
    expect(cart.items[0].unitPrice).toBe(512.4);
    expect(cart.items[0].totalPrice).toBe(512.4);
    expect(cart.items[0].supportEnabled).toBe(false);
    expect(cart.items[1].unitPrice).toBe(39.28);
    expect(cart.items[1].totalPrice).toBe(78.56);
    expect(cart.items[1].isPreorder).toBe(false);
  });

  it('adet ve dosya bilgilerini korur', async () => {
    await cartService.applyServerPrices([{ index: 1, unitPrice: 39.28, totalPrice: 78.56 }]);

    const cart = readCart();
    expect(cart.items[1].quantity).toBe(2);
    expect(cart.items[1].fileId).toBe('file-2');
    expect(cart.items[1].supportEnabled).toBe(true);
  });

  it('olmayan indeksleri sessizce atlar', async () => {
    const applied = await cartService.applyServerPrices([
      { index: 5, unitPrice: 1, totalPrice: 1 },
    ]);

    expect(applied).toBe(false);
    expect(readCart().items[0].unitPrice).toBe(450.32);
  });
});

describe('applyStoreItemPrices', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  });

  it('mağaza kaleminin fiyatını günceller', () => {
    localStorage.setItem(
      'axis3_cart_store',
      JSON.stringify([
        {
          productId: 'p1',
          name: 'Nozul',
          slug: 'nozul',
          imageUrl: null,
          unitPrice: 100,
          quantity: 2,
          totalPrice: 200,
        },
      ])
    );

    const applied = applyStoreItemPrices([{ index: 0, unitPrice: 125, totalPrice: 250 }]);

    expect(applied).toBe(true);
    const items = getStoreItems();
    expect(items[0].unitPrice).toBe(125);
    expect(items[0].totalPrice).toBe(250);
    expect(items[0].quantity).toBe(2);
  });

  it('değişiklik yoksa yazmaz', () => {
    expect(applyStoreItemPrices([])).toBe(false);
  });
});
