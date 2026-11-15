import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { updateCouponSchema } from '@/lib/validations/coupon';
import {
  AdminCouponError,
  deleteCoupon,
  updateCoupon,
} from '@/lib/services/admin-coupon-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Geçersiz istek' },
        { status: 400 }
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
    }

    const coupon = await updateCoupon(createServiceClient(), id, parsed.data);
    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    if (error instanceof AdminCouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Coupons API] Update error:', error);
    return NextResponse.json({ error: 'Kupon güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const result = await deleteCoupon(createServiceClient(), id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AdminCouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Coupons API] Delete error:', error);
    return NextResponse.json({ error: 'Kupon silinemedi' }, { status: 500 });
  }
}
