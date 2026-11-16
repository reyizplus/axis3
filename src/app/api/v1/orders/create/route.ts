/**
 * POST /api/v1/orders/create
 *
 * Server-side order creation. Prices, totals, stock and ownership are all
 * validated against the database; the client payload only carries references
 * (file IDs, product IDs, quantity, address).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrder, OrderCreationError } from '@/lib/services/order-creation-service';
import { createGenericRateLimiter } from '@/lib/utils/rate-limit-configs';
import { createOrderSchema } from './schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.status }
      );
    }
    console.error('[Order Create API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
