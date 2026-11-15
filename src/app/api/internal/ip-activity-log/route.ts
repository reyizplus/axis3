import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

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
    const { ip_address, user_id, page_url, user_agent, device_type } = body;

    if (!page_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const resolvedIP = (ip_address && ip_address !== 'unknown') ? ip_address : getRequestIP(request);

    // Not: dosya tabanlı loglar (app.log / activity.log) proxy'de yazılıyor.
    // Burada yalnızca veritabanı kaydı oluşturulur.

    try {
      const serviceClient = createServiceClient();
      await serviceClient.from('ip_activity_logs').insert({
        ip_address: resolvedIP,
        user_id: user_id || null,
        user_agent: user_agent || null,
        device_type: device_type || 'unknown',
        page_url,
      });
    } catch (dbError) {
      console.error('[Internal] Failed to write IP activity log to DB:', dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Internal] IP activity log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
