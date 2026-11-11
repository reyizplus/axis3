import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*, blocked_by_user:users!blocked_ips_blocked_by_fkey(id, email, full_name)')
      .order('blocked_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Blocked IPs API] Error:', error);
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin || !user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { ip_address, reason, expires_at } = body;

    if (!ip_address) return NextResponse.json({ error: 'IP adresi gerekli' }, { status: 400 });

    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_ips')
      .select('id, reason, blocked_at, expires_at')
      .eq('ip_address', ip_address)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: 'Bu IP adresi zaten engellenmiş.',
        code: 'ALREADY_BLOCKED',
        existing,
      }, { status: 409 });
    }

    const { data, error } = await supabase.from('blocked_ips').insert({
      ip_address,
      reason: reason || null,
      blocked_by: user.id,
      expires_at: expires_at || null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Blocked IPs API] Error:', error);
    return NextResponse.json({ error: 'IP engellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const { error } = await supabase.from('blocked_ips').update({ is_active: false }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Blocked IPs API] Error:', error);
    return NextResponse.json({ error: 'IP çözülemedi' }, { status: 500 });
  }
}
