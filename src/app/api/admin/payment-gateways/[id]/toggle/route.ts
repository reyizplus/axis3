import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const isEnabled = body.isEnabled;

    // If trying to disable, check it's not the last enabled gateway
    if (!isEnabled) {
      const { data: gateways, error: countError } = await supabase
        .from('payment_gateways')
        .select('id, is_enabled');

      if (countError) throw countError;

      const enabledCount = gateways.filter((g: any) => g.is_enabled && g.id !== id).length;
      if (enabledCount === 0) {
        return NextResponse.json(
          { error: 'Son aktif ödeme yöntemi devre dışı bırakılamaz', code: 'LAST_GATEWAY' },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from('payment_gateways')
      .update({
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling gateway:', error);
    return NextResponse.json({ error: 'Failed to toggle gateway' }, { status: 500 });
  }
}
