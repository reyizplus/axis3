import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ gateways: data });
  } catch (error) {
    console.error('Error fetching payment gateways:', error);
    return NextResponse.json({ error: 'Failed to fetch payment gateways' }, { status: 500 });
  }
}
