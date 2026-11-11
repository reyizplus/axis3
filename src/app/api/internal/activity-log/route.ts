import { NextRequest, NextResponse } from 'next/server';
import { appendActivityLog, appendLog } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRequestIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, user_email, user_name, page_url, ip_address, user_agent, device_type } = body;

    if (!user_id || !page_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const resolvedIP = (ip_address && ip_address !== 'unknown') ? ip_address : getRequestIP(request);

    appendActivityLog({
      user_id,
      user_email: user_email || '',
      user_name: user_name || '',
      page_url,
      ip_address: resolvedIP,
      user_agent: user_agent || null,
      device_type: device_type || 'unknown',
    });

    // "Uygulama" log sekmesi bu dosyayı okur; daha önce hiçbir yer yazmadığı için boş görünüyordu.
    appendLog(
      `[${new Date().toISOString()}] ${page_url} | IP: ${resolvedIP} | User: ${String(user_id).substring(0, 8)}${user_email ? ` (${user_email})` : ''}`
    );

    try {
      const supabase = await createClient();
      await supabase.from('user_activity_logs').insert({
        user_id,
        ip_address: resolvedIP,
        user_agent: user_agent || null,
        device_type: device_type || 'unknown',
        page_url,
      });
    } catch (dbError) {
      console.error('[Internal] Failed to write activity log to DB:', dbError);
    }

    try {
      const auditClient = createServiceClient();
      await auditClient.from('audit_logs').insert({
        user_id,
        action: 'page_view',
        entity_type: 'page',
        entity_id: page_url,
        ip_address: resolvedIP,
        user_agent: user_agent || null,
      });
    } catch (dbError) {
      console.error('[Internal] Failed to write audit log:', dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Internal] Activity log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
