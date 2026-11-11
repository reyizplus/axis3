import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UserListItem {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
  last_active_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort_by') || 'last_active_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

    const validSortFields = ['email', 'full_name', 'created_at', 'last_sign_in_at', 'last_active_at'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'last_active_at';
    const order = sortOrder === 'asc' ? 1 : -1;

    const serviceSupabase = createServiceClient();

    // Supabase listUsers varsayılan olarak 50 kullanıcı döndürür; sayfalayarak tümünü al.
    const authUsers: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null; user_metadata?: Record<string, unknown> }[] = [];
    let authPage = 1;
    while (true) {
      const { data: authPageData, error: authError } = await serviceSupabase.auth.admin.listUsers({
        page: authPage,
        perPage: 1000,
      });

      if (authError) {
        return NextResponse.json({ error: 'Kullanıcılar alınamadı', details: authError.message }, { status: 500 });
      }

      authUsers.push(...authPageData.users);
      if (authPageData.users.length < 1000) break;
      authPage += 1;
    }

    const { data: userProfiles } = await supabase
      .from('users')
      .select('id, full_name, phone, status');

    const profileMap = new Map<string, any>(
      ((userProfiles || []) as any[]).map((p) => [p.id, p])
    );

    // Kullanıcı başına son aktivite. PostgREST 1000 satırla sınırlı olduğu için
    // tüm kullanıcıların son kaydı bulunana kadar sayfalar halinde okunur.
    const userIds = new Set(authUsers.map((u) => u.id));
    const lastActivityMap = new Map<string, string>();
    const ACTIVITY_PAGE = 1000;
    let activityOffset = 0;

    while (lastActivityMap.size < userIds.size && activityOffset < 200000) {
      const { data: activityRows, error: activityError } = await serviceSupabase
        .from('user_activity_logs')
        .select('user_id, created_at')
        .order('created_at', { ascending: false })
        .range(activityOffset, activityOffset + ACTIVITY_PAGE - 1);

      if (activityError || !activityRows || activityRows.length === 0) break;

      for (const entry of activityRows) {
        if (entry.user_id && userIds.has(entry.user_id) && !lastActivityMap.has(entry.user_id)) {
          lastActivityMap.set(entry.user_id, entry.created_at);
        }
      }

      if (activityRows.length < ACTIVITY_PAGE) break;
      activityOffset += ACTIVITY_PAGE;
    }

    const allUsers: UserListItem[] = authUsers.map((u) => {
      const isUserAdmin = u.user_metadata?.role === 'admin' || u.email?.endsWith('@axis3.com.tr') || false;
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email || '',
        full_name: profile?.full_name || (u.user_metadata?.full_name as string | undefined) || null,
        phone: profile?.phone || null,
        is_admin: isUserAdmin,
        status: profile?.status || 'active',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        last_active_at: lastActivityMap.get(u.id) || u.last_sign_in_at || null,
      };
    });

    allUsers.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (field === 'last_active_at') {
        aVal = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
        bVal = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
      } else if (field === 'last_sign_in_at') {
        aVal = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
        bVal = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
      } else if (field === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else if (field === 'email') {
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
      } else if (field === 'full_name') {
        aVal = (a.full_name || a.email).toLowerCase();
        bVal = (b.full_name || b.email).toLowerCase();
      }

      if (typeof aVal === 'string') {
        return (aVal as string).localeCompare(bVal as string) * order;
      }
      return ((aVal as number) - (bVal as number)) * order;
    });

    const total = allUsers.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = allUsers.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      data: paged,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json({ error: 'Kullanıcılar alınamadı' }, { status: 500 });
  }
}
