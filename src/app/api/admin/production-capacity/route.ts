import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'production_capacity';

interface ProductionCapacitySettings {
  machineCount: number;
  workingHoursPerDay: number;
  workingDaysPerWeek: number;
  bufferTimePercentage: number;
  cargoDays: number;
}

const DEFAULT_SETTINGS: ProductionCapacitySettings = {
  machineCount: 1,
  workingHoursPerDay: 8,
  workingDaysPerWeek: 5,
  bufferTimePercentage: 20,
  cargoDays: 2,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    const settings: ProductionCapacitySettings = (data?.value as unknown as ProductionCapacitySettings) || DEFAULT_SETTINGS;
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

    const body: ProductionCapacitySettings = await request.json();

    const svc = createServiceClient();
    const { error } = await svc
      .from('global_settings')
      .upsert({
        key: SETTINGS_KEY,
        value: body as unknown as Json,
        category: 'production_capacity',
        updated_by: user.id,
      }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi' }, { status: 500 });
  }
}
