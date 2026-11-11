import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.toLowerCase();

    let files = await adminServiceServer.getAllFiles();

    if (type === 'stl') {
      files = files.filter((f: any) =>
        f.mime_type === 'model/stl' || f.filename?.endsWith('.stl')
      );
    } else if (type === 'image') {
      files = files.filter((f: any) =>
        f.mime_type?.startsWith('image/')
      );
    }

    if (search) {
      files = files.filter((f: any) =>
        f.original_filename?.toLowerCase().includes(search) ||
        f.users?.full_name?.toLowerCase().includes(search) ||
        f.users?.email?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, files });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Dosyalar alınamadı',
    }, { status: 500 });
  }
}
