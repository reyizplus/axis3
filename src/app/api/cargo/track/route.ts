import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const orderNumber = request.nextUrl.searchParams.get('order_number');
    if (!orderNumber || orderNumber.trim().length < 3) {
      return NextResponse.json({ error: 'Geçersiz sipariş numarası' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const trimmed = orderNumber.trim();

    const { data, error } = await supabase
      .from('orders')
      .select('order_number, tracking_number, cargo_company, cargo_status, shipped_at, estimated_delivery, cargo_price, status, created_at')
      .ilike('order_number', `%${trimmed}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data) {
      return NextResponse.json({ error: 'Sipariş numarası ile eşleşen gönderi bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Cargo Track API] Error:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}
