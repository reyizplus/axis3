/**
 * `POST /api/v1/orders/create` istek şeması.
 *
 * Ayrı dosyada tutuluyor ki testler Zod'un hangi alanları koruduğunu
 * doğrudan kontrol edebilsin. Zod varsayılan olarak tanımsız anahtarları
 * **sessizce siler**: şemada olmayan bir alan sunucuya hiç ulaşmaz. Bu yüzden
 * istemcinin gönderdiği her fiyat girdisi burada açıkça yer almak zorunda.
 */

import { z } from 'zod';

export const orderItemSchema = z.object({
  fileId: z.string().uuid(),
  materialId: z.string().uuid(),
  quantity: z.number().int().min(1).max(1000),
  color: z.string().max(50).optional().nullable(),
  nozzleSizeId: z.string().uuid().optional().nullable(),
  nozzleSizeMm: z.number().positive().optional().nullable(),
  /**
   * Destek yapıları. Fiyatı değiştiren bir seçimdir (destek işçiliği ve
   * destek gramı) ve önizleme profili hash'ini de belirler; şemadan düşerse
   * sunucu her kalemi "destekli" fiyatlar ve istemcinin gösterdiği tutarla
   * sapma (409) oluşur.
   */
  supportEnabled: z.boolean().optional().nullable(),
  printSettingId: z.string().max(100).optional().nullable(),
  printSettingName: z.string().max(100).optional().nullable(),
  isPreorder: z.boolean().optional(),
  preorderDiscountPercent: z.number().min(0).max(100).optional().nullable(),
  estimatedRestockDays: z.number().int().min(0).max(365).optional().nullable(),
  customLayerHeight: z.number().positive().optional().nullable(),
  customInfillPercentage: z.number().min(0).max(100).optional().nullable(),
  customTimeMultiplier: z.number().positive().optional().nullable(),
  customLayerThickness: z.number().positive().optional().nullable(),
  customExposureTime: z.number().positive().optional().nullable(),
});

export const storeItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(1000),
});

export const addressSchema = z.object({
  fullName: z.string().min(2).max(150),
  phone: z.string().min(10).max(50),
  city: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  neighborhood: z.string().min(1).max(150),
  street: z.string().min(1).max(250),
  buildingNo: z.string().min(1).max(20),
  apartmentNo: z.string().max(20).optional().default(''),
  zipCode: z.string().max(20).optional().default(''),
  notes: z.string().max(1000).optional().default(''),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).max(50).default([]),
  storeItems: z.array(storeItemSchema).max(50).default([]),
  address: addressSchema,
  paymentMethod: z.string().min(1).max(50),
  deliveryNotes: z.string().max(1000).optional(),
  couponCode: z.string().trim().min(1).max(64).optional(),
  expectedTotal: z.number().min(0).max(10_000_000).optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
