import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readLogFile, APP_LOG, ERROR_LOG } from '@/lib/logger';
import * as os from 'os';
import type { Database } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UserRow = Database['public']['Tables']['users']['Row'];

interface ActivityRow {
  id: string;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string;
  page_url: string | null;
  created_at: string;
}

const APP_LINE_REGEX = /^\[(.+?)\]\s+(.+?)\s+\|\s+IP:\s+(.+?)\s+\|\s+User:\s+(.+?)(?:\s+\((.+?)\))?(?:\s+|$)/;

interface ParsedAppLine {
  timestamp?: string;
  path?: string;
  ip?: string;
  userId?: string;
  email?: string;
  guest?: boolean;
  raw: string;
  _parseError?: boolean;
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function parseAppLine(line: string) {
  const match = line.match(APP_LINE_REGEX);
  if (!match) return null;
  const [, timestamp, path, ip, userId, email] = match;
  const guest = userId === 'guest';
  return { timestamp, path, ip, userId, email: email || '', guest, raw: line };
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: isAdmin } = await authClient.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin yetkisi gereklidir' }, { status: 403 });
    }

    const supabase = authClient;

    const searchParams = request.nextUrl.searchParams;
    const lines = Math.min(Math.max(parseInt(searchParams.get('lines') || '100') || 100, 10), 50000);
    const source = searchParams.get('source') || 'app';
    const parsed = searchParams.get('parsed') === 'true';

    // Aktivite kayıtları kalıcı veritabanından okunur (dosya tabanlı log sunucu
    // yeniden başladığında kayboluyordu).
    const isDbSource = source === 'activity';

    const logFiles: Record<string, string> = {
      app: APP_LOG,
      error: ERROR_LOG,
    };

    const logPath = isDbSource ? null : logFiles[source];
    if (!isDbSource && !logPath) {
      return NextResponse.json({ error: `Geçersiz kaynak: ${source}` }, { status: 400 });
    }

    const rawLines = logPath ? readLogFile(lines, logPath) : [];

    let parsedData: unknown[] | null = null;
    const userMap = new Map<string, UserRow>();

    if (isDbSource) {
      const limit = Math.min(lines, 2000);
      const columns = 'id, user_id, ip_address, user_agent, device_type, page_url, created_at';

      const [userActivityResult, ipActivityResult] = await Promise.all([
        supabase
          .from('user_activity_logs')
          .select(columns)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('ip_activity_logs')
          .select(columns)
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      const rows: ActivityRow[] = [
        ...((userActivityResult.data || []) as ActivityRow[]),
        ...((ipActivityResult.data || []) as ActivityRow[]),
      ]
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, limit);

      const userIds = new Set<string>();
      for (const row of rows) {
        if (row.user_id) userIds.add(row.user_id);
      }

      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', [...userIds]);

        if (users) {
          for (const user of users as UserRow[]) {
            userMap.set(user.id, user);
          }
        }
      }

      parsedData = rows.map((row) => {
        const user = row.user_id ? userMap.get(row.user_id) : null;
        const email = user?.email || '';
        const fullName = user?.full_name || '';
        return {
          id: row.id,
          userId: row.user_id || '',
          userEmail: email,
          userName: fullName,
          pageUrl: row.page_url || '-',
          ipAddress: row.ip_address || '-',
          userAgent: row.user_agent,
          deviceType: row.device_type || 'unknown',
          timestamp: row.created_at,
          raw: `${row.created_at} | ${row.ip_address || '-'} | ${row.user_id ? email || row.user_id : 'misafir'} | ${row.page_url || '-'}`,
          user: user ? { id: user.id, email: user.email, full_name: user.full_name } : null,
        };
      });
    }

    if (parsed && source === 'app') {
      const entries: ParsedAppLine[] = [];
      const userIds = new Set<string>();

      for (const line of rawLines) {
        const entry = parseAppLine(line);
        if (entry) {
          entries.push(entry);
          if (!entry.guest && entry.userId) userIds.add(entry.userId);
        } else {
          entries.push({ raw: line, _parseError: true });
        }
      }

      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', [...userIds]);

        if (users) {
          for (const user of users as UserRow[]) {
            userMap.set(user.id, user);
          }
        }
      }

      parsedData = entries.map((entry) => {
        if (entry._parseError) return entry;
        const user = !entry.guest && entry.userId && userMap.has(entry.userId)
          ? { id: userMap.get(entry.userId)!.id, email: userMap.get(entry.userId)!.email, full_name: userMap.get(entry.userId)!.full_name }
          : entry.guest ? null : undefined;
        return { ...entry, user: user || null };
      });
    }

    const system = {
      uptime: os.uptime(),
      memory: {
        rss: formatBytes(process.memoryUsage().rss),
        heapTotal: formatBytes(process.memoryUsage().heapTotal),
        heapUsed: formatBytes(process.memoryUsage().heapUsed),
      },
      node: process.version,
      platform: process.platform,
      pid: process.pid,
    };

    return NextResponse.json({
      success: true,
      logPath: logPath || 'veritabanı (user_activity_logs + ip_activity_logs)',
      source,
      lines,
      system,
      data: parsedData || rawLines,
      parsed: parsedData !== null,
    });
  } catch (error) {
    console.error('[Admin Logs] Error:', error);
    return NextResponse.json({ error: 'Loglar alınamadı' }, { status: 500 });
  }
}
