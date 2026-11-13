/**
 * POST /api/v1/orders/[orderId]/cancel
 *
 * Lets a user cancel their own unpaid order (for example when the payment
 * page fails to open). Released stock is returned to inventory exactly once.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cancelOrder } from '@/lib/services/order-cancellation-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Oturum süreniz dolmuş' }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: order } = await (supabase.from('orders') as any)
      .select('id, user_id, status, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Ödemesi alınmış sipariş iptal edilemez' },
        { status: 409 }
      );
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ success: true });
    }

    await cancelOrder(orderId, 'Kullanıcı tarafından iptal edildi');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Order Cancel API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Sipariş iptal edilemedi' },
      { status: 500 }
    );
  }
}
