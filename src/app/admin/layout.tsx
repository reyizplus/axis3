import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';
import { AdminShell } from '@/components/layout/admin-shell';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Yönetim | AXIS3',
  description: 'AXIS3 yönetim paneli.',
  keywords: 'yönetim paneli, admin, AXIS3 yönetim',
  url: `${SITE_URL}/admin`,
  noIndex: true,
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: any;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (!user) {
    redirect('/login');
  }
  
  let isAdmin = false;
  try {
    isAdmin = await adminServiceServer.isAdmin();
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) {
    redirect('/dashboard');
  }

  const isSuperAdmin = user.email?.endsWith('@axis3.com.tr') || false;
  let permissions: string[] | null = null;

  if (!isSuperAdmin) {
    try {
      const svc = createServiceClient();
      const { data } = await (svc as any)
        .from('admin_permissions')
        .select('section_key')
        .eq('user_id', user.id);
      permissions = (data || []).map((r: any) => r.section_key);
    } catch {
      permissions = null;
    }
  }

  return <AdminShell permissions={permissions} isSuperAdmin={isSuperAdmin}>{children}</AdminShell>;
}
