'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuthEvent } from '../utils/audit';
import { generateCode } from '../utils/crypto';
import type { AuthResult } from '../types';
import { mailService } from '@/lib/services/mail-service';

export async function verifyEmail(code: string): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Oturum bulunamadı' };
    }

    const { data: verification } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'email_verification')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verification) {
      return { success: false, error: 'Geçerli bir doğrulama kodu bulunamadı' };
    }

    if (verification.attempts >= 3) {
      return { success: false, error: 'Çok fazla yanlış deneme. Yeni kod talep edin.' };
    }

    if (verification.code !== code) {
      await supabase.from('verification_codes')
        .update({ attempts: (verification.attempts || 0) + 1 })
        .eq('id', verification.id);

      const remaining = 3 - (verification.attempts + 1);
      return {
        success: false,
        error: remaining > 0
          ? `Geçersiz kod. ${remaining} deneme hakkınız kaldı.`
          : 'Çok fazla yanlış deneme. Yeni kod talep edin.',
      };
    }

    await supabase.from('verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verification.id);

    await supabase.from('users')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await logAuthEvent('EMAIL_VERIFY', user.id, user.email ?? null);

    return { success: true, message: 'E-posta doğrulandı' };
  } catch (error) {
    console.error('[verifyEmail] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function resendVerificationCode(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return { success: false, error: 'Oturum bulunamadı' };
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const { count } = await supabase
      .from('verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'email_verification')
      .gte('created_at', fifteenMinutesAgo.toISOString());

    if (count && count >= 3) {
      return { success: false, error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' };
    }

    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await supabase.from('verification_codes').insert({
      user_id: user.id,
      code,
      type: 'email_verification',
      expires_at: expiresAt.toISOString(),
      attempts: 0,
    });

    await mailService.sendVerificationCode(user.email, code);

    return { success: true, message: 'Doğrulama kodu gönderildi' };
  } catch (error) {
    console.error('[resendVerificationCode] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}
