/**
 * POST /api/v1/coupons/validate
 *
 * Cart/checkout preview. The subtotals in the request are only used to show a
 * discount; they never price an order. Order creation recomputes both the cart
 * and the coupon server-side, and that value is the one that is charged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  COUPON_UNAVAILABLE_MESSAGE,
  checkCoupon,
  couponFailureStatus,
  isCouponSystemEnabled,
  isValidCouponCodeFormat,
  normalizeCouponCode,
} from '@/lib/services/coupon-service';
import { createGenericRateLimiter } from '@/lib/utils/rate-limit-configs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const validateSchema = z.object({
  code: z.string().min(1).max(64),
  itemsSubtotal: z.number().min(0).max(10_000_000),
  serviceSubtotal: z.number().min(0).max(10_000_000),
  storeSubtotal: z.number().min(0).max(10_000_000),
});

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Oturum süreniz dolmuş' },
        { status: 401 }
      );
    }

    const limiter = createGenericRateLimiter();
    const rate = await limiter.limit(`coupon-validate:${user.id}`);
    if (!rate.success) {
      return NextResponse.json(
        { valid: false, error: 'Çok fazla deneme. Lütfen kısa bir süre sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: parsed.error.issues[0]?.message || 'Geçersiz istek' },
        { status: 400 }
      );
    }

    const code = normalizeCouponCode(parsed.data.code);
    if (!isValidCouponCodeFormat(code)) {
      return NextResponse.json(
        { valid: false, error: 'Geçersiz kupon kodu' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    if (!(await isCouponSystemEnabled(supabase))) {
      return NextResponse.json(
        { valid: false, error: COUPON_UNAVAILABLE_MESSAGE },
        { status: 503 }
      );
    }

    const check = await checkCoupon(supabase, {
      code,
      userId: user.id,
      itemsSubtotal: parsed.data.itemsSubtotal,
      serviceSubtotal: parsed.data.serviceSubtotal,
      storeSubtotal: parsed.data.storeSubtotal,
    });

    if (!check.available) {
      return NextResponse.json(
        { valid: false, error: COUPON_UNAVAILABLE_MESSAGE },
        { status: 503 }
      );
    }

    if (!check.ok) {
      return NextResponse.json(
        {
          valid: false,
          reason: check.evaluation.reason,
          error: check.evaluation.message,
        },
        { status: couponFailureStatus(check.evaluation.reason) }
      );
    }

    return NextResponse.json({
      valid: true,
      code: check.coupon.code,
      discountType: check.rules.discountType,
      discountAmount: check.evaluation.discountAmount,
      freeShipping: check.evaluation.freeShipping,
      description: check.coupon.description,
    });
  } catch (error) {
    console.error('[Coupon Validate API] Unexpected error:', error);
    return NextResponse.json(
      { valid: false, error: 'Kupon doğrulanamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
