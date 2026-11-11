import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AuditRow = Database['public']['Tables']['audit_logs']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

interface EnrichedAuditEntry extends AuditRow {
  user: {
    id: string;
    email: string;
    full_name: string;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin yetkisi gereklidir' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    // Sayfa görüntüleme kayıtları varsayılan olarak gizlenir; gürültüyü önler.
    const includePageViews = searchParams.get('includePageViews') === 'true';
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200);

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (action && action !== 'all') {
      query = query.eq('action', action);
    } else if (!includePageViews) {
      query = query.neq('action', 'page_view');
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (search) {
      query = query.or(
        `entity_id.ilike.%${search}%,ip_address.ilike.%${search}%,user_agent.ilike.%${search}%,action.ilike.%${search}%`
      );
    }

    if (from) {
      query = query.gte('created_at', from);
    }

    if (to) {
      query = query.lte('created_at', to);
    }

    const fromRow = (page - 1) * limit;
    const toRow = fromRow + limit - 1;

    const { data: auditLogs, count, error } = await query
      .order('created_at', { ascending: false })
      .range(fromRow, toRow);

    if (error) {
      return NextResponse.json({ error: 'Audit logları alınamadı', details: error.message }, { status: 500 });
    }

    const entries = (auditLogs || []) as AuditRow[];

    const uniqueUserIds = [...new Set(entries.map(e => e.user_id).filter(Boolean) as string[])];

    const userMap = new Map<string, UserRow>();

    if (uniqueUserIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', uniqueUserIds);

      if (users) {
        for (const user of users as UserRow[]) {
          userMap.set(user.id, user);
        }
      }
    }

    const enriched: EnrichedAuditEntry[] = entries.map(entry => ({
      ...entry,
      user: entry.user_id && userMap.has(entry.user_id)
        ? {
            id: userMap.get(entry.user_id)!.id,
            email: userMap.get(entry.user_id)!.email,
            full_name: userMap.get(entry.user_id)!.full_name,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      meta: {
        includePageViews,
        pageViewsExcluded: !includePageViews && (!action || action === 'all'),
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Audit Logs] Error:', error);
    return NextResponse.json({ error: 'Audit logları alınamadı' }, { status: 500 });
  }
}
