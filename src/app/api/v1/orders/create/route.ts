/**
 * POST /api/v1/orders/create
 *
 * Server-side order creation. Prices, totals, stock and ownership are all
 * validated against the database; the client payload only carries references
 * (file IDs, product IDs, quantity, address).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createOrder, OrderCreationError } from '@/lib/services/order-creation-service';
import { createGenericRateLimiter } from '@/lib/utils/rate-limit-configs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const orderItemSchema = z.object({
  fileId: z.string().uuid(),
  materialId: z.string().uuid(),
  quantity: z.number().int().min(1).max(1000),
  color: z.string().max(50).optional().nullable(),
  nozzleSizeId: z.string().uuid().optional().nullable(),
  nozzleSizeMm: z.number().positive().optional().nullable(),
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

const storeItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(1000),
});

const addressSchema = z.object({
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

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).max(50).default([]),
  storeItems: z.array(storeItemSchema).max(50).default([]),
  address: addressSchema,
  paymentMethod: z.string().min(1).max(50),
  deliveryNotes: z.string().max(1000).optional(),
  couponCode: z.string().trim().min(1).max(64).optional(),
  expectedTotal: z.number().min(0).max(10_000_000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Oturum süreniz dolmuş' }, { status: 401 });
    }

    const limiter = createGenericRateLimiter();
    const rate = await limiter.limit(`order-create:${user.id}`);
    if (!rate.success) {
      return NextResponse.json(
        { success: false, error: 'Çok fazla istek. Lütfen kısa bir süre sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Geçersiz istek' },
        { status: 400 }
      );
    }

    const order = await createOrder(parsed.data);
    return NextResponse.json({ success: true, order });
  } catch (error) {
    if (error instanceof OrderCreationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[Order Create API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
