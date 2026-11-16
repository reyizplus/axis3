/**
 * `POST /api/v1/orders/create` istek şeması testleri.
 *
 * Kritik sözleşme: fiyatı etkileyen her istemci alanı Zod'dan **geçmeli**.
 * Zod tanımsız anahtarları sessizce siler; silinen bir alan sunucunun farklı
 * fiyat hesaplamasına, dolayısıyla her sipariş denemesinde 409 "Fiyatlar
 * güncellendi" hatasına yol açar (`supportEnabled` tam olarak bu şekilde
 * düşüyordu).
 */

import { describe, expect, it } from 'vitest';
import { createOrderSchema } from './schema';

const basePayload = {
  items: [
    {
      fileId: '63d950fe-0d4b-4f9c-9eef-295c283107ea',
      materialId: '82a0f069-3508-4cc6-b06a-91e513aabdd0',
      quantity: 1,
    },
  ],
  storeItems: [],
  address: {
    fullName: 'Test Kullanıcı',
    phone: '05551112233',
    city: 'Ankara',
    district: 'Çankaya',
    neighborhood: 'Kızılay',
    street: 'Atatürk Caddesi',
    buildingNo: '1',
  },
  paymentMethod: 'iyzico',
  expectedTotal: 100,
};

describe('sipariş isteği şeması', () => {
  it('destek kapalı seçimini korur (fiyat girdisi)', () => {
    const parsed = createOrderSchema.parse({
      ...basePayload,
      items: [{ ...basePayload.items[0], supportEnabled: false }],
    });

    expect(parsed.items[0].supportEnabled).toBe(false);
  });

  it('destek açık seçimini olduğu gibi korur', () => {
    const parsed = createOrderSchema.parse({
      ...basePayload,
      items: [{ ...basePayload.items[0], supportEnabled: true }],
    });

    expect(parsed.items[0].supportEnabled).toBe(true);
  });

  it('tüm fiyat girdilerini korur', () => {
    const parsed = createOrderSchema.parse({
      ...basePayload,
      items: [
        {
          ...basePayload.items[0],
          color: 'Siyah',
          supportEnabled: false,
          printSettingId: '7257a33d-a469-4cff-9f04-3ab62c7b2d20',
          printSettingName: 'Hızlı Baskı',
          nozzleSizeId: null,
          nozzleSizeMm: 0.4,
          isPreorder: true,
          preorderDiscountPercent: 10,
          estimatedRestockDays: 14,
          customLayerHeight: 0.2,
          customInfillPercentage: 20,
          customTimeMultiplier: 0.5,
          customLayerThickness: 0.05,
          customExposureTime: 8,
        },
      ],
    });

    expect(parsed.items[0]).toMatchObject({
      color: 'Siyah',
      supportEnabled: false,
      printSettingId: '7257a33d-a469-4cff-9f04-3ab62c7b2d20',
      nozzleSizeMm: 0.4,
      isPreorder: true,
      preorderDiscountPercent: 10,
      estimatedRestockDays: 14,
      customLayerHeight: 0.2,
      customInfillPercentage: 20,
      customTimeMultiplier: 0.5,
      customLayerThickness: 0.05,
      customExposureTime: 8,
    });
  });

  it('bilinmeyen alanları hâlâ düşürür (payload yüzeyi dar kalır)', () => {
    const parsed = createOrderSchema.parse({
      ...basePayload,
      totalAmount: 1,
      items: [{ ...basePayload.items[0], unitPrice: 1 }],
    });

    expect(parsed).not.toHaveProperty('totalAmount');
    expect(parsed.items[0]).not.toHaveProperty('unitPrice');
  });

  it('geçersiz destek türünü reddeder', () => {
    const result = createOrderSchema.safeParse({
      ...basePayload,
      items: [{ ...basePayload.items[0], supportEnabled: 'false' }],
    });

    expect(result.success).toBe(false);
  });
});
