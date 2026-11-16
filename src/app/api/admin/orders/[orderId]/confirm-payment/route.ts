import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyOrderStatusChange } from '@/lib/services/order-notification-service';
import type { OrderStatus } from '@/lib/services/order-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin: confirm a bank-transfer / manual payment.
 *
 * The order status is promoted to `payment_received` only when it is still
 * `pending`; a paid order that is already in production keeps its status so
 * confirming a payment can never move an order backwards.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const { orderId } = await params;

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Confirm Payment API] Fetch failed:', fetchError);
      return NextResponse.json({ success: false, error: 'Sipariş alınamadı' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 });
    }

    const oldStatus = order.status as OrderStatus;
    const nextStatus: OrderStatus = oldStatus === 'pending' ? 'payment_received' : oldStatus;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[Confirm Payment API] Update failed:', updateError);
      return NextResponse.json({ success: false, error: 'Ödeme onaylanamadı' }, { status: 500 });
    }

    let emailSent = false;
    if (oldStatus !== nextStatus) {
      const result = await notifyOrderStatusChange(orderId, oldStatus, nextStatus);
      emailSent = result.success;
      if (!result.success) {
        console.error('[Confirm Payment API] Email failed:', result.error);
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      message: emailSent
        ? 'Ödeme onaylandı ve müşteriye bilgi e-postası gönderildi'
        : 'Ödeme onaylandı',
    });
  } catch (error) {
    console.error('[Confirm Payment API] Exception:', error);
    return NextResponse.json({ success: false, error: 'Beklenmeyen bir hata oluştu' }, { status: 500 });
  }
}
