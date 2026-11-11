import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'shipping_settings';

interface ShippingSettings {
  shippingFee: number;
  freeShippingMinAmount: number;
  defaultDeliveryDays: number;
}

const DEFAULT_SETTINGS: ShippingSettings = {
  shippingFee: 0,
  freeShippingMinAmount: 0,
  defaultDeliveryDays: 3,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    const settings: ShippingSettings = (data?.value as unknown as ShippingSettings) || DEFAULT_SETTINGS;
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: 'Ayarlar alınamadı' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body: ShippingSettings = await request.json();

    const svc = createServiceClient();
    const { error } = await (svc
      .from('global_settings') as any)
      .upsert({
        key: SETTINGS_KEY,
        value: body,
        category: 'shipping',
        updated_by: user.id,
      }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi' }, { status: 500 });
  }
}
