import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin yetkisi gereklidir' }, { status: 403 });
    }

    const { id } = await params;

    const detail = await adminServiceServer.getPriceCalculationDetail(id);

    if (!detail) {
      return NextResponse.json({ error: 'Hesaplama bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error('[Admin Price Calculation Detail] Error:', error);
    return NextResponse.json({ error: 'Detay yüklenemedi' }, { status: 500 });
  }
}
