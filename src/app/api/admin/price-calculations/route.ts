import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin yetkisi gereklidir' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const { count: total } = await supabase
      .from('pricing_history')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('pricing_history')
      .select(`
        id,
        material_id,
        print_setting_id,
        calculated_price,
        created_at,
        materials(name),
        print_settings(name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const calculations = (data || []).map((item: any) => ({
      id: item.id,
      material: item.materials?.name || 'Unknown',
      quality: item.print_settings?.name || 'Standard',
      price: item.calculated_price || 0,
      created_at: item.created_at,
    }));

    return NextResponse.json({
      calculations,
      total: total || 0,
      page,
      limit,
      totalPages: Math.ceil((total || 0) / limit),
    });
  } catch (error) {
    console.error('[Admin Price Calculations] Error:', error);
    return NextResponse.json({ error: 'Hesaplamalar yüklenemedi' }, { status: 500 });
  }
}
