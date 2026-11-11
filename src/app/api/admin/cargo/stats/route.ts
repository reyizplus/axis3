import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('orders')
      .select('cargo_company, cargo_status')
      .eq('status', 'shipped')
      .not('cargo_company', 'is', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const counts: Record<string, { total: number; active: number }> = {};

    for (const row of data) {
      const company = row.cargo_company!;
      if (!counts[company]) counts[company] = { total: 0, active: 0 };
      counts[company].total++;
      if (!row.cargo_status || !['delivered', 'failed'].includes(row.cargo_status)) {
        counts[company].active++;
      }
    }

    return NextResponse.json({ success: true, data: counts });
  } catch (error) {
    console.error('[Cargo Stats API] Error:', error);
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}
