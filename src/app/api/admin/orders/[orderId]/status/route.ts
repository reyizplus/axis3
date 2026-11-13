import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mailService } from '@/lib/services/mail-service';
import { releaseOrderStock } from '@/lib/services/order-cancellation-service';
import type { OrderStatus } from '@/lib/services/order-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
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
    const body = await request.json();
    const newStatus = body.status as OrderStatus;
    const cargoCompany = body.cargo_company as string | undefined;
    const trackingNumber = body.tracking_number as string | undefined;
    const shareTrackingLink = body.share_tracking_link !== false;

    if (!newStatus) {
      return NextResponse.json({ success: false, error: 'Durum belirtilmedi' }, { status: 400 });
    }

    const validStatuses: OrderStatus[] = [
      'pending', 'payment_received', 'preparing', 'printing', 'quality_check',
      'washing', 'curing', 'packaging', 'shipped', 'delivered', 'cancelled', 'refunded'
    ];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ success: false, error: 'Geçersiz durum' }, { status: 400 });
    }

    const { data: oldOrder } = await supabase
      .from('orders')
      .select('status, payment_status, tracking_number, cargo_company')
      .eq('id', orderId)
      .single();

    if (!oldOrder) {
      return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 });
    }

    const oldStatus = oldOrder.status;
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'shipped' && cargoCompany ? { cargo_company: cargoCompany } : {}),
        ...(newStatus === 'shipped' && trackingNumber ? { tracking_number: trackingNumber, shipped_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[Order Status API] Update error:', updateError);
      return NextResponse.json({ success: false, error: 'Durum güncellenemedi' }, { status: 500 });
    }

    // An unpaid order cancelled by an admin must give its reserved stock back.
    // For a paid order the material has been consumed, so the stock is not
    // returned (that would inflate inventory).
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled' && oldOrder.payment_status !== 'paid') {
      const released = await releaseOrderStock(orderId);
      if (!released) {
        console.error('[Order Status API] Could not release stock for cancelled order:', orderId);
      }
    }

    const { data: completeOrder } = await supabase
      .from('orders')
      .select('*, user:users(email, full_name)')
      .eq('id', orderId)
      .single();

    let emailSent = false;
    if (completeOrder && oldStatus !== newStatus) {
      const result = await mailService.sendOrderStatusUpdate(completeOrder, oldStatus);
      emailSent = result.success;
      if (!result.success) {
        console.error('[Order Status API] Email failed:', result.error);
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      message: emailSent
        ? 'Sipariş durumu güncellendi ve e-posta gönderildi'
        : 'Sipariş durumu güncellendi (e-posta gönderilemedi)',
    });
  } catch (error) {
    console.error('[Order Status API] Exception:', error);
    return NextResponse.json({ success: false, error: 'Beklenmeyen bir hata oluştu' }, { status: 500 });
  }
}
