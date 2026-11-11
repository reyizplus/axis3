import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';
import { UsersListContent } from './_components/user-list-content';

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export interface UserListItem {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isAdmin = await adminServiceServer.isAdmin();
  if (!isAdmin) redirect('/dashboard');

  const serviceSupabase = createServiceClient();
  const { data: authUsers } = await serviceSupabase.auth.admin.listUsers();

  const { data: userProfiles } = await supabase
    .from('users')
    .select('id, full_name, phone, status');

  const profileMap = new Map<string, any>(
    ((userProfiles || []) as any[]).map((p) => [p.id, p])
  );

  const allUsers: UserListItem[] = (authUsers?.users || []).map((u) => {
    const isUserAdmin = u.user_metadata?.role === 'admin' || u.email?.endsWith('@axis3.com.tr') || false;
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email || '',
      full_name: profile?.full_name || u.user_metadata?.full_name || null,
      is_admin: isUserAdmin,
      status: profile?.status || 'active',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
    };
  });

  return <UsersListContent users={allUsers} />;
}
