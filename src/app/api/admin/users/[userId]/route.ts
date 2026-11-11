import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: isAdmin } = await authClient.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Only axis3.com.tr users can manage admin roles and permissions
    const isSuperAdmin = user.email?.endsWith('@axis3.com.tr') || false;

    if (body.setPermissions) {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Sadece @axis3.com.tr yöneticiler yetkileri düzenleyebilir' }, { status: 403 });
      }
      if (!Array.isArray(body.permissions)) {
        return NextResponse.json({ error: 'Geçersiz yetki listesi' }, { status: 400 });
      }
      await adminServiceServer.setAdminPermissions(userId, body.permissions);
      return NextResponse.json({ success: true });
    }

    if (body.toggleRole) {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Sadece @axis3.com.tr yöneticiler admin yetkisi verebilir/kaldırabilir' }, { status: 403 });
      }

      const svc = createServiceClient();
      const { data: targetUser } = await svc.auth.admin.getUserById(userId);
      const isCurrentlyAdmin = targetUser?.user?.user_metadata?.role === 'admin';

      if (body.action === 'revoke' || isCurrentlyAdmin) {
        const result = await adminServiceServer.revokeAdminRole(userId, user);
        return NextResponse.json(result);
      } else {
        const sections = Array.isArray(body.sections) ? body.sections : undefined;
        const result = await adminServiceServer.grantAdminRole(userId, user, sections);
        return NextResponse.json(result);
      }
    }

    if (body.status) {
      const validStatuses = ['active', 'suspended', 'deleted'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 });
      }
      await adminServiceServer.updateUserStatus(userId, body.status);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'İşlem başarısız',
    }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: isAdmin } = await authClient.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Kendinizi silemezsiniz' }, { status: 400 });
    }

    // Only axis3.com.tr users can delete users
    if (!user.email?.endsWith('@axis3.com.tr')) {
      return NextResponse.json({ error: 'Sadece @axis3.com.tr yöneticiler kullanıcı silebilir' }, { status: 403 });
    }

    const result = await adminServiceServer.deleteUser(userId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Kullanıcı silinemedi',
    }, { status: 500 });
  }
}
