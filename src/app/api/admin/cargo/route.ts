import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CARGO_STATUSES = ['pending', 'accepted', 'in_transit', 'out_for_delivery', 'delivered', 'failed'] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const searchParams = request.nextUrl.searchParams;
    const cargoCompany = searchParams.get('cargo_company');
    const cargoStatus = searchParams.get('cargo_status');
    const search = searchParams.get('search');

    let query = supabase
      .from('orders')
      .select('*, user:users!orders_user_id_fkey(id, email, full_name)')
      .eq('status', 'shipped')
      .order('shipped_at', { ascending: false });

    if (cargoCompany) query = query.eq('cargo_company', cargoCompany);
    if (cargoStatus) query = query.eq('cargo_status', cargoStatus);
    if (search) query = query.or(
      `order_number.ilike.%${search}%,tracking_number.ilike.%${search}%,cargo_company.ilike.%${search}%`
    );

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Cargo API] Error:', error);
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { order_id, cargo_company, tracking_number, cargo_status, cargo_price, share_tracking_link, estimated_delivery } = body;

    if (!order_id) return NextResponse.json({ error: 'Sipariş ID gerekli' }, { status: 400 });

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (cargo_company !== undefined) updateData.cargo_company = cargo_company;
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
    if (cargo_status !== undefined) {
      if (!CARGO_STATUSES.includes(cargo_status)) {
        return NextResponse.json({ error: 'Geçersiz kargo durumu' }, { status: 400 });
      }
      updateData.cargo_status = cargo_status;
      if (cargo_status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
    }
    if (cargo_price !== undefined) updateData.cargo_price = cargo_price;
    if (share_tracking_link !== undefined) updateData.share_tracking_link = share_tracking_link;
    if (estimated_delivery !== undefined) updateData.estimated_delivery = estimated_delivery;

    const { error } = await (supabase.from('orders') as any).update(updateData).eq('id', order_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Kargo bilgileri güncellendi' });
  } catch (error) {
    console.error('[Cargo API PATCH] Error:', error);
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 });
  }
}
