import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IpActivityRow = { id: string; user_id: string | null; ip_address: string; user_agent: string | null; page_url: string; device_type: string; created_at: string };

interface EnrichedEntry extends IpActivityRow {
  user: { id: string; email: string; full_name: string } | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const ip = searchParams.get('ip');
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200);

    if (!ip) {
      return NextResponse.json({ error: 'IP adresi gerekli' }, { status: 400 });
    }

    const fromRow = (page - 1) * limit;
    const toRow = fromRow + limit - 1;

    const { data: entries, count, error } = await supabase
      .from('ip_activity_logs')
      .select('*', { count: 'exact' })
      .eq('ip_address', ip)
      .order('created_at', { ascending: false })
      .range(fromRow, toRow);

    if (error) {
      return NextResponse.json({ error: 'IP aktivite logları alınamadı', details: error.message }, { status: 500 });
    }

    const rows = (entries || []) as IpActivityRow[];
    const uniqueUserIds = [...new Set(rows.map(e => e.user_id).filter(Boolean) as string[])];
    const userMap = new Map<string, { id: string; email: string; full_name: string }>();
    if (uniqueUserIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, email, full_name').in('id', uniqueUserIds);
      if (users) {
        for (const user of users as { id: string; email: string; full_name: string }[]) {
          userMap.set(user.id, user);
        }
      }
    }

    const enriched: EnrichedEntry[] = rows.map(entry => ({
      ...entry,
      user: entry.user_id && userMap.has(entry.user_id)
        ? userMap.get(entry.user_id)!
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('[Admin IP Activity] Error:', error);
    return NextResponse.json({ error: 'IP aktivite logları alınamadı' }, { status: 500 });
  }
}
