import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Session } from '@supabase/supabase-js';
import type { SessionUser } from '../types';

export async function getCurrentSession(): Promise<{ user: SessionUser | null; session: Session | null }> {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return { user: null, session: null };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, phone, is_corporate, email_verified, two_factor_enabled')
    .eq('id', session.user.id)
    .maybeSingle();

  const user: SessionUser = {
    id: session.user.id,
    email: session.user.email || '',
    fullName: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Kullanıcı',
    phone: profile?.phone || '',
    isCorporate: profile?.is_corporate || false,
    emailVerified: profile?.email_verified || false,
    twoFactorEnabled: profile?.two_factor_enabled || false,
  };

  return { user, session };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const { user } = await getCurrentSession();
  return user;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
