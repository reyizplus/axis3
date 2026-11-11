import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ActivityRow {
  user_id: string | null;
  ip_address: string | null;
  page_url: string | null;
  created_at: string;
}

interface UserInfo {
  email: string;
  full_name: string;
}

function groupByIp(rows: ActivityRow[], userMap: Record<string, UserInfo>) {
  const map = new Map<
    string,
    { ip: string; count: number; lastSeen: string; lastPage: string; userId: string | null }
  >();

  for (const row of rows) {
    if (!row.ip_address) continue;
    const existing = map.get(row.ip_address);
    if (!existing) {
      map.set(row.ip_address, {
        ip: row.ip_address,
        count: 1,
        lastSeen: row.created_at,
        lastPage: row.page_url || '-',
        userId: row.user_id,
      });
      continue;
    }
    existing.count += 1;
    if (Date.parse(row.created_at) > Date.parse(existing.lastSeen)) {
      existing.lastSeen = row.created_at;
      existing.lastPage = row.page_url || '-';
    }
    if (row.user_id) existing.userId = row.user_id;
  }

  return [...map.values()]
    .sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen))
    .map((entry) => ({
      ...entry,
      user: entry.userId ? userMap[entry.userId] || null : null,
      isGuest: !entry.userId,
    }));
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const twentyFourHAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const serviceClient = createServiceClient();
    const columns = 'user_id, ip_address, page_url, created_at';

    const [activeUserResult, activeIPResult, summaryUserResult, summaryIPResult] = await Promise.all([
      serviceClient
        .from('user_activity_logs')
        .select(columns)
        .gte('created_at', fiveMinAgo)
        .order('created_at', { ascending: false }),
      serviceClient
        .from('ip_activity_logs')
        .select(columns)
        .gte('created_at', fiveMinAgo)
        .order('created_at', { ascending: false }),
      serviceClient
        .from('user_activity_logs')
        .select(columns)
        .gte('created_at', twentyFourHAgo)
        .order('created_at', { ascending: false }),
      serviceClient
        .from('ip_activity_logs')
        .select(columns)
        .gte('created_at', twentyFourHAgo)
        .order('created_at', { ascending: false }),
    ]);

    const activeRows: ActivityRow[] = [
      ...((activeUserResult.data || []) as ActivityRow[]),
      ...((activeIPResult.data || []) as ActivityRow[]),
    ];
    const summaryRows: ActivityRow[] = [
      ...((summaryUserResult.data || []) as ActivityRow[]),
      ...((summaryIPResult.data || []) as ActivityRow[]),
    ];

    // Son 5 dakikada görülen kayıtlı kullanıcılar — kullanıcı bazında gruplanır.
    const byUser = new Map<
      string,
      { userId: string; lastSeen: string; lastPage: string; ips: Set<string>; requestCount: number }
    >();
    for (const row of activeRows) {
      if (!row.user_id) continue;
      const existing = byUser.get(row.user_id);
      if (!existing) {
        byUser.set(row.user_id, {
          userId: row.user_id,
          lastSeen: row.created_at,
          lastPage: row.page_url || '-',
          ips: new Set(row.ip_address ? [row.ip_address] : []),
          requestCount: 1,
        });
        continue;
      }
      existing.requestCount += 1;
      if (row.ip_address) existing.ips.add(row.ip_address);
      if (Date.parse(row.created_at) > Date.parse(existing.lastSeen)) {
        existing.lastSeen = row.created_at;
        existing.lastPage = row.page_url || '-';
      }
    }

    // İsim/e-posta çözümü için ihtiyaç duyulan tüm kullanıcılar.
    const userIds = new Set<string>();
    for (const row of [...activeRows, ...summaryRows]) {
      if (row.user_id) userIds.add(row.user_id);
    }

    const userMap: Record<string, UserInfo> = {};    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', [...userIds]);
      if (users) {
        for (const user of users as { id: string; email: string; full_name: string | null }[]) {
          userMap[user.id] = { email: user.email, full_name: user.full_name || '' };
        }
      }
    }

    const activeUsers = [...byUser.values()]
      .map((entry) => ({
        userId: entry.userId,
        email: userMap[entry.userId]?.email || null,
        fullName: userMap[entry.userId]?.full_name || null,
        lastSeen: entry.lastSeen,
        lastPage: entry.lastPage,
        ips: [...entry.ips],
        requestCount: entry.requestCount,
      }))
      .sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen));

    const activeIPs = groupByIp(activeRows, userMap);
    const ipDetails = groupByIp(summaryRows, userMap);

    const uniqueIPs = new Set<string>();
    const uniqueUsers = new Set<string>();
    const pageCounts: Record<string, number> = {};
    for (const row of summaryRows) {
      if (row.ip_address) uniqueIPs.add(row.ip_address);
      if (row.user_id) uniqueUsers.add(row.user_id);
      const page = row.page_url || 'bilinmeyen';
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    }

    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([page, count]) => ({ page, count }));

    return NextResponse.json({
      success: true,
      activeUsers,
      activeIPs,
      ipDetails,
      summary: {
        activeUsers: activeUsers.length,
        activeIPs: activeIPs.length,
        uniqueIPs: uniqueIPs.size,
        uniqueUsers: uniqueUsers.size,
        totalRequests: summaryRows.length,
        topPages,
      },
    });
  } catch (error) {
    console.error('[Active Users API] Error:', error);
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}
