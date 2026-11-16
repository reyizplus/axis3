'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyCodeSchema, twoFactorToggleSchema } from '../schemas';
import { checkRateLimit, recordRateLimitAttempt } from '../utils/rate-limiter';
import { logAuthEvent } from '../utils/audit';
import { getCurrentUser, requireAuth } from '../utils/session';
import { decrypt, generateCode, generateRecoveryCodes } from '../utils/crypto';
import { hashVerificationCode, matchesVerificationCode } from '../utils/verification-code';
import { generateTOTPSecret, generateTOTPQRCodeURL, verifyTOTP } from '../utils/totp';
import type { AuthResult } from '../types';
import { mailService } from '@/lib/services/mail-service';

/** Failed attempts allowed for a single e-mailed 2FA code before it is burned. */
const MAX_2FA_ATTEMPTS = 5;

/** How long an e-mailed 2FA code stays valid. */
const EMAIL_CODE_TTL_MINUTES = 5;

/**
 * Re-send the e-mailed 2FA code of an in-progress login.
 *
 * Only possible while a pending 2FA session exists, so this cannot be used to
 * mail arbitrary addresses. Every previous unused code for the address is
 * burned first, otherwise the old code would stay valid.
 */
export async function resend2FACode(email: string): Promise<AuthResult> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail) {
      return { success: false, error: 'E-posta adresi gerekli' };
    }

    const rateCheck = await checkRateLimit(`2fa-resend:${normalizedEmail}`, '2fa');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Çok fazla kod talebi. Lütfen daha sonra tekrar deneyin.' };
    }

    const serviceClient = createServiceClient();

    const { data: pending } = await serviceClient
      .from('pending_2fa_sessions')
      .select('id')
      .eq('email', normalizedEmail)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pending) {
      return { success: false, error: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' };
    }

    const burnCodes = () =>
      serviceClient
        .from('verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('email', normalizedEmail)
        .eq('type', '2fa_email')
        .is('used_at', null);

    await burnCodes();

    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);

    const { error: insertError } = await serviceClient.from('verification_codes').insert({
      email: normalizedEmail,
      code_hash: hashVerificationCode(code, normalizedEmail),
      type: '2fa_email',
      expires_at: expiresAt.toISOString(),
      attempts: 0,
    });

    await recordRateLimitAttempt(`2fa-resend:${normalizedEmail}`, '2fa');

    if (insertError) {
      console.error('[resend2FACode] Insert failed:', insertError);
      return { success: false, error: 'Doğrulama kodu oluşturulamadı. Lütfen tekrar deneyin.' };
    }

    const mailResult = await mailService.sendVerificationCode(normalizedEmail, code, {
      purpose: '2fa',
      expiresInMinutes: EMAIL_CODE_TTL_MINUTES,
    });

    if (!mailResult.success) {
      await burnCodes();
      console.error('[resend2FACode] Mail failed:', mailResult.error);
      return { success: false, error: 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.' };
    }

    return {
      success: true,
      message: 'Yeni doğrulama kodu gönderildi',
    };
  } catch (error) {
    console.error('[resend2FACode] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function verify2FACode(email: string, code: string): Promise<AuthResult> {
  try {
    const serviceClient = createServiceClient();

    const { data: verification } = await serviceClient
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('type', '2fa_email')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verification) {
      return { success: false, error: 'Geçersiz veya süresi dolmuş kod' };
    }

    // A code that has already exhausted its attempts is unusable, even if the
    // caller keeps sending the correct digits.
    if ((verification.attempts ?? 0) >= MAX_2FA_ATTEMPTS) {
      await serviceClient
        .from('verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', verification.id);

      return { success: false, error: 'Çok fazla yanlış deneme. Lütfen tekrar giriş yapın.' };
    }

    if (!matchesVerificationCode(code, email, verification.code_hash)) {
      const attempts = (verification.attempts ?? 0) + 1;

      await serviceClient
        .from('verification_codes')
        .update({ attempts })
        .eq('id', verification.id);

      await logAuthEvent('TWO_FACTOR_FAILURE', verification.user_id, email);

      const remaining = MAX_2FA_ATTEMPTS - attempts;

      return {
        success: false,
        error: remaining > 0
          ? `Geçersiz doğrulama kodu. ${remaining} deneme hakkınız kaldı.`
          : 'Çok fazla yanlış deneme. Lütfen tekrar giriş yapın.',
      };
    }

    await serviceClient.from('verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verification.id);

    const { data: pending } = await serviceClient
      .from('pending_2fa_sessions')
      .select('*')
      .eq('email', email.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pending) {
      return { success: false, error: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' };
    }

    const password = decrypt(pending.password_hash);
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError) {
      return { success: false, error: 'Giriş başarısız. Lütfen tekrar deneyin.' };
    }

    await serviceClient.from('pending_2fa_sessions')
      .delete()
      .eq('id', pending.id);

    await logAuthEvent('TWO_FACTOR_VERIFY', authData.user.id, email);

    return { success: true, message: 'Giriş başarılı' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    console.error('[verify2FACode] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function setupTOTP(): Promise<AuthResult<{ secret: string; qrCodeUrl: string }>> {
  try {
    const user = await requireAuth();

    const secret = generateTOTPSecret();
    const qrCodeUrl = generateTOTPQRCodeURL(secret, user.email);

    const supabase = await createClient();

    await supabase.from('users')
      .update({ two_factor_secret: secret })
      .eq('id', user.id);

    return {
      success: true,
      message: 'TOTP kurulumu başlatıldı',
      data: { secret, qrCodeUrl },
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    if (error instanceof Error && error.message === 'Authentication required') {
      return { success: false, error: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.' };
    }
    console.error('[setupTOTP] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function verifyTOTPSetup(token: string): Promise<AuthResult<{ recoveryCodes: string[] }>> {
  try {
    const user = await requireAuth();

    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('users')
      .select('two_factor_secret')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.two_factor_secret) {
      return { success: false, error: 'TOTP kurulumu bulunamadı' };
    }

    if (!verifyTOTP(profile.two_factor_secret, token)) {
      await logAuthEvent('TWO_FACTOR_FAILURE', user.id, user.email);
      return { success: false, error: 'Geçersiz doğrulama kodu' };
    }

    const recoveryCodes = generateRecoveryCodes();

    await supabase.from('users')
      .update({
        two_factor_enabled: true,
        two_factor_recovery_codes: recoveryCodes,
      })
      .eq('id', user.id);

    await logAuthEvent('TWO_FACTOR_ENABLE', user.id, user.email);

    return {
      success: true,
      message: 'İki adımlı doğrulama etkinleştirildi',
      data: { recoveryCodes },
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    if (error instanceof Error && error.message === 'Authentication required') {
      return { success: false, error: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.' };
    }
    console.error('[verifyTOTPSetup] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function verifyTOTPLogin(email: string, token: string): Promise<AuthResult> {
  try {
    const serviceClient = createServiceClient();

    const { data: user } = await serviceClient
      .from('users')
      .select('id, two_factor_secret')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!user?.two_factor_secret) {
      return { success: false, error: 'İki adımlı doğrulama yapılandırılmamış' };
    }

    if (!verifyTOTP(user.two_factor_secret, token)) {
      await logAuthEvent('TWO_FACTOR_FAILURE', user.id, email);
      return { success: false, error: 'Geçersiz doğrulama kodu' };
    }

    const { data: pending } = await serviceClient
      .from('pending_2fa_sessions')
      .select('*')
      .eq('email', email.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pending) {
      return { success: false, error: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' };
    }

    const password = decrypt(pending.password_hash);
    const supabase = await createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError) {
      return { success: false, error: 'Giriş başarısız' };
    }

    await serviceClient.from('pending_2fa_sessions')
      .delete()
      .eq('id', pending.id);

    await logAuthEvent('TWO_FACTOR_VERIFY', user.id, email);

    return { success: true, message: 'Giriş başarılı' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    console.error('[verifyTOTPLogin] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function toggle2FA(enabled: boolean): Promise<AuthResult> {
  try {
    const user = await requireAuth();

    const validated = twoFactorToggleSchema.safeParse({ enabled });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const supabase = await createClient();

    if (enabled) {
      return { success: false, error: 'Önce TOTP kurulumu yapmalısınız' };
    }

    await supabase.from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_recovery_codes: null,
      })
      .eq('id', user.id);

    await logAuthEvent('TWO_FACTOR_DISABLE', user.id, user.email);

    return { success: true, message: 'İki adımlı doğrulama devre dışı bırakıldı' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    if (error instanceof Error && error.message === 'Authentication required') {
      return { success: false, error: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.' };
    }
    console.error('[toggle2FA] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function getRecoveryCodes(): Promise<AuthResult<{ codes: string[] }>> {
  try {
    const user = await requireAuth();

    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('users')
      .select('two_factor_recovery_codes')
      .eq('id', user.id)
      .maybeSingle();

    const codes = profile?.two_factor_recovery_codes as string[] | null;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return { success: false, error: 'Kurtarma kodları bulunamadı' };
    }

    return {
      success: true,
      data: { codes },
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    if (error instanceof Error && error.message === 'Authentication required') {
      return { success: false, error: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.' };
    }
    console.error('[getRecoveryCodes] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function verifyRecoveryCode(email: string, code: string): Promise<AuthResult> {
  try {
    const serviceClient = createServiceClient();

    const { data: user } = await serviceClient
      .from('users')
      .select('id, two_factor_recovery_codes')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const codes = user?.two_factor_recovery_codes as string[] | null;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return { success: false, error: 'Kurtarma kodları bulunamadı' };
    }

    const codeIndex = codes.indexOf(code);
    if (codeIndex === -1) {
      await logAuthEvent('TWO_FACTOR_FAILURE', user!.id, email);
      return { success: false, error: 'Geçersiz kurtarma kodu' };
    }

    codes.splice(codeIndex, 1);

    const remainingCodes = codes.length > 0 ? codes : null;

    await serviceClient.from('users')
      .update({
        two_factor_recovery_codes: remainingCodes,
        ...(remainingCodes === null ? { two_factor_enabled: false } : {}),
      })
      .eq('id', user!.id);

    const { data: pending } = await serviceClient
      .from('pending_2fa_sessions')
      .select('*')
      .eq('email', email.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pending) {
      return { success: false, error: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' };
    }

    const password = decrypt(pending.password_hash);
    const supabase = await createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError) {
      return { success: false, error: 'Giriş başarısız' };
    }

    await serviceClient.from('pending_2fa_sessions')
      .delete()
      .eq('id', pending.id);

    await logAuthEvent('TWO_FACTOR_VERIFY', user!.id, email);

    return { success: true, message: 'Giriş başarılı' };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    console.error('[verifyRecoveryCode] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}
