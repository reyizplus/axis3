'use server';

import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { loginSchema } from '../schemas';
import { checkRateLimit, recordRateLimitAttempt } from '../utils/rate-limiter';
import { logAuthEvent } from '../utils/audit';
import { getCurrentUser } from '../utils/session';
import { generateCode, encrypt } from '../utils/crypto';
import { hashVerificationCode } from '../utils/verification-code';
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

  // Tek normalizasyon noktası: aşağıda hem `verification_codes` hem de
  // `pending_2fa_sessions` bu değerle yazılır ve okunur. Aksi halde
  // "Ali@Example.com" ile yazılan kod, lowercase ile arayan doğrulama
  // adımında asla bulunamıyordu.
  const email = validated.data.email.trim().toLowerCase();
  const password = validated.data.password;

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

  // 2FA durumu okunamazsa girişe izin verilmez (fail-closed). Önceden servis
  // istemcisi kurulamadığında `userProfile` null kalıyor ve 2FA sessizce
  // atlanıyordu; bu, güvenlik katmanını tek bir env hatasıyla devre dışı
  // bırakıyordu.
  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch (e) {
    console.error('[signIn] service client unavailable:', e);
    try { await supabase.auth.signOut(); } catch {}
    return {
      success: false,
      error: 'Giriş şu anda yapılamıyor. Lütfen daha sonra tekrar deneyin.',
    };
  }

  let userProfile: { id: string; two_factor_enabled: boolean } | null = null;
  try {
    const { data, error } = await (serviceClient
      .from('users')
      .select('id, two_factor_enabled')
      .eq('id', authData.user.id)
      .maybeSingle() as unknown as Promise<{ data: { id: string; two_factor_enabled: boolean } | null; error: any }>);
    if (error) throw error;
    userProfile = data;
  } catch (e) {
    console.error('[signIn] user profile query failed:', e);
    try { await supabase.auth.signOut(); } catch {}
    return {
      success: false,
      error: 'Giriş şu anda yapılamıyor. Lütfen daha sonra tekrar deneyin.',
    };
  }

  if (userProfile?.two_factor_enabled) {
    try {
      await supabase.auth.signOut();

      const code = generateCode(6);
      // The code is valid for 5 minutes, but the pending session stays alive
      // longer so the customer can request a fresh code without logging in
      // again from scratch.
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const pendingExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const { error: codeInsertError } = await serviceClient
        .from('verification_codes')
        .insert({
          user_id: authData.user.id,
          email,
          code_hash: hashVerificationCode(code, email),
          type: '2fa_email',
          expires_at: expiresAt.toISOString(),
          attempts: 0,
        });

      if (codeInsertError) {
        console.error('[signIn] 2FA code insert failed:', codeInsertError);
        return { success: false, error: 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.' };
      }

      const mailResult = await mailService.sendVerificationCode(email, code, {
        purpose: '2fa',
        expiresInMinutes: 5,
      });
      if (!mailResult.success) {
        // The user must not be able to use a code that was never delivered.
        await serviceClient
          .from('verification_codes')
          .update({ used_at: new Date().toISOString() })
          .eq('email', email.toLowerCase())
          .eq('type', '2fa_email')
          .is('used_at', null);

        console.error('[signIn] 2FA email failed:', mailResult.error);
        return { success: false, error: 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.' };
      }

      const encryptedPassword = encrypt(password);

      const { error: pendingError } = await serviceClient
        .from('pending_2fa_sessions')
        .insert({
          email,
          password_hash: encryptedPassword,
          two_factor_enabled: true,
          user_metadata: { user_id: authData.user.id },
          expires_at: pendingExpiresAt.toISOString(),
        });

      if (pendingError) {
        console.error('[signIn] 2FA session insert failed:', pendingError);
        return { success: false, error: 'Doğrulama başlatılamadı. Lütfen tekrar deneyin.' };
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
