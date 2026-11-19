/**
 * `POST /api/v1/orders/quote` istek şeması.
 *
 * Sipariş oluşturma ile aynı kalem şemasını kullanır: teklif, siparişin
 * fiyatlandırdığı aynı alanları görmek zorunda. Burada olmayan bir alan
 * (ör. `supportEnabled`) sessizce silinir ve teklif ile sipariş fiyatı
 * ayrışır.
 */

import { z } from 'zod';
import { orderItemSchema, storeItemSchema } from '../create/schema';

export const quoteCartSchema = z.object({
  items: z.array(orderItemSchema).max(50).default([]),
  storeItems: z.array(storeItemSchema).max(50).default([]),
  couponCode: z.string().trim().min(1).max(64).optional(),
});

export type QuoteCartRequest = z.infer<typeof quoteCartSchema>;
