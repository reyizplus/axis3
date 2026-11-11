import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';
import { StorageContent } from '@/components/admin/storage/storage-content';

export const dynamic = 'force-dynamic';

export default async function AdminStoragePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const isAdmin = await adminServiceServer.isAdmin();
  if (!isAdmin) redirect('/dashboard');

  const [files, stats] = await Promise.all([
    adminServiceServer.getAllFiles().catch(() => []),
    adminServiceServer.getStorageStats().catch(() => null),
  ]);

  return (
    <StorageContent
      files={files as any[]}
      stats={stats as any}
    />
  );
}
