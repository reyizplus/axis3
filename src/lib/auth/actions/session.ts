'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuthEvent } from '../utils/audit';
import { getCurrentUser } from '../utils/session';
import type { AuthResult, SessionUser } from '../types';

export async function signOut(): Promise<AuthResult> {
  try {
    const user = await getCurrentUser();
    const supabase = await createClient();
    await supabase.auth.signOut();
    if (user) {
      await logAuthEvent('LOGOUT', user.id, user.email);
    }
    return { success: true, message: 'Çıkış başarılı' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    console.error('[signOut] Error:', error);
    return { success: false, error: 'Çıkış yapılırken bir hata oluştu' };
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}
