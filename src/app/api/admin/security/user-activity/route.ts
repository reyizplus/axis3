import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ActivityEntry {
  id: string;
  page_url: string;
  ip_address: string;
  device_type: string;
  user_agent: string | null;
  created_at: string;
  source: 'user_activity' | 'ip_activity' | 'audit';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200);

    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı ID gerekli' }, { status: 400 });
    }

    const fetchLimit = limit * 3;

    const serviceClient = createServiceClient();

    const [userActivityRes, ipActivityRes, auditRes] = await Promise.all([
      serviceClient
        .from('user_activity_logs')
        .select('id, page_url, ip_address, device_type, user_agent, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(fetchLimit),
      supabase
        .from('ip_activity_logs')
        .select('id, page_url, ip_address, device_type, user_agent, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(fetchLimit),
      serviceClient
        .from('audit_logs')
        .select('id, entity_id, ip_address, user_agent, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(fetchLimit),
    ]);

    const toEntry = (e: any, source: ActivityEntry['source'], pageUrl: string): ActivityEntry => ({
      id: e.id,
      page_url: pageUrl,
      ip_address: e.ip_address || 'unknown',
      device_type: e.device_type || 'unknown',
      user_agent: e.user_agent,
      created_at: e.created_at,
      source,
    });

    const allEntries = [
      ...(userActivityRes.data || []).map((e: any) => toEntry(e, 'user_activity', e.page_url || '')),
      ...(ipActivityRes.data || []).map((e: any) => toEntry(e, 'ip_activity', e.page_url || '')),
      ...(auditRes.data || []).map((e: any) => toEntry(e, 'audit', e.entity_id || '')),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = (userActivityRes.count || 0) + (ipActivityRes.count || 0) + (auditRes.count || 0);
    const totalPages = Math.ceil(total / limit);
    const fromRow = (page - 1) * limit;
    const paginated = allEntries.slice(fromRow, fromRow + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error('[Admin User Activity] Error:', error);
    return NextResponse.json({ error: 'Kullanıcı aktivite logları alınamadı' }, { status: 500 });
  }
}
