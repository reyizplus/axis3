import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { bulkGenerateSchema } from '@/lib/validations/coupon';
import {
  AdminCouponError,
  bulkGenerateCoupons,
} from '@/lib/services/admin-coupon-service';
import { normalizeCouponCode } from '@/lib/services/coupon-service';

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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = bulkGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Geçersiz istek' },
        { status: 400 }
      );
    }

    const result = await bulkGenerateCoupons(
      createServiceClient(),
      {
        ...parsed.data,
        codePrefix: parsed.data.codePrefix
          ? normalizeCouponCode(parsed.data.codePrefix).replace(/[^A-Z0-9]/g, '')
          : null,
      },
      auth.user.id
    );

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminCouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Coupons API] Bulk generate error:', error);
    return NextResponse.json({ error: 'Toplu kod üretimi başarısız oldu' }, { status: 500 });
  }
}
