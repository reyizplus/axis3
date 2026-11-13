'use server';

import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { loginSchema } from '../schemas';
import { checkRateLimit, recordRateLimitAttempt } from '../utils/rate-limiter';
import { logAuthEvent } from '../utils/audit';
import { getCurrentUser } from '../utils/session';
import { generateCode, encrypt } from '../utils/crypto';
import type { AuthResult } from '../types';
import { mailService } from '@/lib/services/mail-service';

export async function signIn(formData: FormData): Promise<AuthResult<{ requiresTwoFactor?: boolean; email?: string }>> {
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { email, password } = validated.data;

  try {
    const rateCheck = await checkRateLimit(`login:${email}`, 'login');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.' };
    }
  } catch {
    // Rate limit check failed: fail closed in production, allow in development
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'Giriş şu anda yapılamıyor. Lütfen daha sonra tekrar deneyin.' };
    }
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }

  let authData, authError;
  try {
    const result = await supabase.auth.signInWithPassword({ email, password });
    authData = result.data;
    authError = result.error;
  } catch (e) {
    console.error('[signIn] signInWithPassword threw:', e);
    try { await recordRateLimitAttempt(`login:${email}`, 'login'); } catch {}
    try { await logAuthEvent('LOGIN_FAILURE', null, email); } catch {}
    return { success: false, error: 'E-posta veya şifre hatalı' };
  }

  if (authError || !authData?.user) {
    try { await recordRateLimitAttempt(`login:${email}`, 'login'); } catch {}
    try { await logAuthEvent('LOGIN_FAILURE', null, email); } catch {}
    return { success: false, error: 'E-posta veya şifre hatalı' };
  }

  let serviceClient: ReturnType<typeof createServiceClient> | null = null;
  try {
    serviceClient = createServiceClient();
  } catch {}

  let userProfile: { id: string; two_factor_enabled: boolean } | null = null;
  if (serviceClient) {
    try {
      const { data } = await (serviceClient
        .from('users')
        .select('id, two_factor_enabled')
        .eq('id', authData.user.id)
        .maybeSingle() as unknown as Promise<{ data: { id: string; two_factor_enabled: boolean } | null; error: any }>);
      userProfile = data;
    } catch (e) {
      console.error('[signIn] user profile query failed:', e);
    }
  }

  if (userProfile?.two_factor_enabled) {
    try {
      await supabase.auth.signOut();

      const code = generateCode(6);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      if (serviceClient) {
        await serviceClient.from('verification_codes').insert({
          user_id: authData.user.id,
          email: email,
          code,
          type: '2fa_email',
          expires_at: expiresAt.toISOString(),
          attempts: 0,
        });
      }

      await mailService.sendVerificationCode(email, code);

      const encryptedPassword = encrypt(password);
      if (serviceClient) {
        await serviceClient.from('pending_2fa_sessions').insert({
          email,
          password_hash: encryptedPassword,
          two_factor_enabled: true,
          user_metadata: { user_id: authData.user.id },
          expires_at: expiresAt.toISOString(),
        });
      }

      return {
        success: true,
        message: 'Doğrulama kodu gönderildi',
        data: { requiresTwoFactor: true, email },
      };
    } catch (e) {
      console.error('[signIn] 2FA flow failed:', e);
      return { success: false, error: 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.' };
    }
  }

  try { await logAuthEvent('LOGIN_SUCCESS', authData.user.id, email); } catch {}

  return { success: true, message: 'Giriş başarılı' };
}
