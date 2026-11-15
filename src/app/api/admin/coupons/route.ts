import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createCouponSchema, listCouponsQuerySchema } from '@/lib/validations/coupon';
import {
  AdminCouponError,
  createCoupon,
  listCoupons,
} from '@/lib/services/admin-coupon-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns the authenticated admin, or the response to send back. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = listCouponsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Geçersiz istek' },
        { status: 400 }
      );
    }

    const coupons = await listCoupons(createServiceClient(), parsed.data);
    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    if (error instanceof AdminCouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Coupons API] List error:', error);
    return NextResponse.json({ error: 'Kuponlar yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Geçersiz istek' },
        { status: 400 }
      );
    }

    const coupon = await createCoupon(createServiceClient(), parsed.data, auth.user.id);
    return NextResponse.json({ success: true, coupon }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminCouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Coupons API] Create error:', error);
    return NextResponse.json({ error: 'Kupon oluşturulamadı' }, { status: 500 });
  }
}
