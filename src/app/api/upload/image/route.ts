import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { quotaService } from '@/lib/services/quota-service';
import { adminServiceServer } from '@/lib/services/admin-service-server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum 5MB.' },
        { status: 400 }
      );
    }

    // Admins bypass upload quota (blog/store images shouldn't count against their limit)
    const isAdmin = await adminServiceServer.isAdmin().catch(() => false);
    if (!isAdmin) {
      const canUpload = await quotaService.canUpload(user.id);
      if (!canUpload) {
        return NextResponse.json(
          { error: 'Yükleme kotanız doldu.' },
          { status: 403 }
        );
      }
    }

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();

    const svc = createServiceClient();
    const { data: bucketCheck } = await svc.storage.getBucket('images');
    if (!bucketCheck) {
      await svc.storage.createBucket('images', {
        public: true,
        fileSizeLimit: MAX_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      });
    } else {
      await svc.storage.updateBucket('images', {
        public: true,
        fileSizeLimit: MAX_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      });
    }

    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      console.error('[Upload] Storage error:', error);
      return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(data.path);

    try {
      await supabase.from('files').insert({
        user_id: user.id,
        filename: fileName,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: data.path,
        bucket_name: 'images',
        analysis_status: 'completed',
        has_errors: false,
        metadata: {},
      } as any);
    } catch (dbError) {
      console.error('[Upload] Failed to create DB record:', dbError);
    }

    return NextResponse.json({
      url: publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
