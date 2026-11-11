import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: isAdmin } = await authClient.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const file = await adminServiceServer.getFileById(fileId);
    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const expiresIn = Math.min(parseInt(searchParams.get('expiresIn') || '3600'), 86400);

    const fileRecord = file as any;
    const bucketName = fileRecord.mime_type?.startsWith('image/') ? 'images' : 'stl-files';

    const signedUrl = await adminServiceServer.getFileSignedUrl(
      fileRecord.storage_path,
      expiresIn,
      bucketName
    );

    return NextResponse.json({ success: true, signedUrl });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'URL alınamadı',
    }, { status: 500 });
  }
}
