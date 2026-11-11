import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: isAdmin } = await authClient.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stats = await adminServiceServer.getStorageStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'İstatistikler alınamadı',
    }, { status: 500 });
  }
}
