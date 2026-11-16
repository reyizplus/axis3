'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { forgotPasswordSchema, resetPasswordSchema } from '../schemas';
import { checkRateLimit, recordRateLimitAttempt } from '../utils/rate-limiter';
import { logAuthEvent } from '../utils/audit';
import { getCurrentUser, requireAuth } from '../utils/session';
import { generateToken } from '../utils/crypto';
import type { AuthResult } from '../types';
import { mailService } from '@/lib/services/mail-service';

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    const validated = forgotPasswordSchema.safeParse({ email });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const normalizedEmail = email.toLowerCase();

    const rateCheck = await checkRateLimit(`password-reset:${normalizedEmail}`, 'password-reset');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' };
    }

    const serviceClient = createServiceClient();

    const { data: user } = await serviceClient
      .from('users')
      .select('id, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!user) {
      await recordRateLimitAttempt(`password-reset:${normalizedEmail}`, 'password-reset');
      return { success: true, message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' };
    }

    const token = generateToken(32);
    const urlToken = generateToken(16);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Reset links are single-use: issuing a new link must invalidate every
    // previously issued, still-unused token for this account.
    const { error: invalidateError } = await serviceClient
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('used_at', null);

    if (invalidateError) {
      console.error('[requestPasswordReset] Could not invalidate old tokens:', invalidateError);
    }

    await serviceClient.from('password_reset_tokens').insert({
      user_id: user.id,
      token,
      url_token: urlToken,
      expires_at: expiresAt.toISOString(),
    });

    // Bağlantı, formun token'ı okuduğu gerçek sayfaya (/reset-password?ref=...)
    // işaret etmek zorunda. Önceden /auth/sifre-sifirla kullanılıyordu ve bu
    // route mevcut olmadığı için e-postadaki bağlantı 404 dönüyordu.
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${appUrl}/reset-password?ref=${urlToken}`;

    const mailResult = await mailService.sendPasswordResetEmail(normalizedEmail, resetUrl);
    await recordRateLimitAttempt(`password-reset:${normalizedEmail}`, 'password-reset');

    if (!mailResult.success) {
      // Kullanıcıya "gönderildi" demek yerine gerçek durumu bildir; aksi halde
      // e-posta hiç gitmediği için bağlantı çalışmıyor gibi görünüyordu.
      console.error('[requestPasswordReset] Mail gönderilemedi:', mailResult.error);
      return {
        success: false,
        error: 'Şifre sıfırlama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.',
      };
    }

    await logAuthEvent('PASSWORD_RESET_REQUEST', user.id, normalizedEmail);

    return { success: true, message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    console.error('[requestPasswordReset] Error:', error);
    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

export async function validateResetToken(
  ref: string
): Promise<{ valid: boolean; email?: string }> {
  try {
    const serviceClient = createServiceClient();

    const { data: tokenRecord } = await serviceClient
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .or(`token.eq.${ref},url_token.eq.${ref}`)
      .maybeSingle();

    if (!tokenRecord || tokenRecord.used_at || new Date(tokenRecord.expires_at) < new Date()) {
      return { valid: false };
    }

    // The reset page shows which account is being reset. The holder of this
    // single-use link already controls the mailbox, so returning the address
    // does not leak anything new.
    const { data: account } = await serviceClient
      .from('users')
      .select('email')
      .eq('id', tokenRecord.user_id)
      .maybeSingle();

    return { valid: true, email: account?.email ?? undefined };
  } catch (error) {
    console.error('[validateResetToken] Error:', error);
    return { valid: false };
  }
}

export async function resetPassword(ref: string, password: string): Promise<AuthResult> {
  try {
    const validated = resetPasswordSchema.safeParse({ password });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const serviceClient = createServiceClient();

    const { data: tokenRecord } = await serviceClient
      .from('password_reset_tokens')
      .select('*')
      .or(`token.eq.${ref},url_token.eq.${ref}`)
      .maybeSingle();

    if (!tokenRecord || tokenRecord.used_at || new Date(tokenRecord.expires_at) < new Date()) {
      return { success: false, error: 'Geçersiz veya süresi dolmuş bağlantı' };
    }

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      tokenRecord.user_id,
      { password: validated.data.password }
    );

    if (updateError) {
      return { success: false, error: 'Şifre güncellenemedi' };
    }

    await serviceClient.from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    await serviceClient.auth.admin.signOut(tokenRecord.user_id);
    await logAuthEvent('PASSWORD_RESET_SUCCESS', tokenRecord.user_id, null);

    return { success: true, message: 'Şifreniz başarıyla güncellendi' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    console.error('[resetPassword] Error:', error);
    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  try {
    const validated = resetPasswordSchema.safeParse({ password });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const user = await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password: validated.data.password,
    });

    if (error) {
      return { success: false, error: 'Şifre güncellenemedi' };
    }

    const serviceClient = createServiceClient();
    await serviceClient.auth.admin.signOut(user.id);
    await logAuthEvent('PASSWORD_CHANGE', user.id, user.email);

    return { success: true, message: 'Şifreniz başarıyla güncellendi. Lütfen tekrar giriş yapın.' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    if (error instanceof Error && error.message === 'Authentication required') {
      return { success: false, error: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.' };
    }
    console.error('[updatePassword] Error:', error);
    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

export async function logoutAllDevices(): Promise<AuthResult> {
  try {
    const user = await requireAuth();
    const serviceClient = createServiceClient();

    await serviceClient.auth.admin.signOut(user.id);
    await logAuthEvent('LOGOUT', user.id, user.email);

    return { success: true, message: 'Tüm cihazlardan çıkış yapıldı' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    if (error instanceof Error && error.message === 'Authentication required') {
      return { success: false, error: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.' };
    }
    console.error('[logoutAllDevices] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}
