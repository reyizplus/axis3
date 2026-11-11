import { NextResponse } from 'next/server';

export async function requireAdmin(supabase: any): Promise<NextResponse | null> {
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || !isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin yetkisi gereklidir' },
      { status: 403 }
    );
  }
  return null;
}

export async function requirePermission(
  supabase: any,
  sectionKey: string
): Promise<NextResponse | null> {
  // First check if user is admin
  const adminGuard = await requireAdmin(supabase);
  if (adminGuard) return adminGuard;

  // Then check specific permission
  const { data: hasPerm, error: permError } = await supabase.rpc('has_admin_permission', {
    section_key: sectionKey,
  });

  if (permError || !hasPerm) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Bu bölüme erişim yetkiniz yok' },
      { status: 403 }
    );
  }
  return null;
}
