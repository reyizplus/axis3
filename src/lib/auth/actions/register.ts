'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { registerCompleteSchema, registerEmailSchema } from '../schemas';
import { checkRateLimit, recordRateLimitAttempt } from '../utils/rate-limiter';
import { logAuthEvent } from '../utils/audit';
import { generateCode } from '../utils/crypto';
import { hashVerificationCode, matchesVerificationCode } from '../utils/verification-code';
import type { AuthResult } from '../types';
import { mailService } from '@/lib/services/mail-service';

export async function sendRegistrationCode(email: string): Promise<AuthResult> {
  try {
    const validated = registerEmailSchema.safeParse({ email });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const rateCheck = await checkRateLimit(`register:${email}`, 'register');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' };
    }

    const serviceClient = createServiceClient();

    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return { success: false, error: 'Bu e-posta adresi zaten kayıtlı' };
    }

    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { error: insertError } = await serviceClient.from('verification_codes').insert({
      email: email.toLowerCase(),
      code_hash: hashVerificationCode(code, email),
      type: 'registration',
      expires_at: expiresAt.toISOString(),
      attempts: 0,
    });

    if (insertError) {
      console.error('[sendRegistrationCode] Insert failed:', insertError);
      return { success: false, error: 'Doğrulama kodu oluşturulamadı. Lütfen tekrar deneyin.' };
    }

    const emailResult = await mailService.sendVerificationCode(email, code, {
      purpose: 'registration',
      expiresInMinutes: 15,
    });
    if (!emailResult.success) {
      return { success: false, error: 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.' };
    }

    try { await recordRateLimitAttempt(`register:${email}`, 'register'); } catch {}

    return { success: true, message: 'Doğrulama kodu gönderildi' };
  } catch (error) {
    console.error('[sendRegistrationCode] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function verifyRegistrationCode(email: string, code: string): Promise<AuthResult> {
  try {
    const serviceClient = createServiceClient();

    const { data: verification } = await serviceClient
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('type', 'registration')
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

    if (!matchesVerificationCode(code, email, verification.code_hash)) {
      await serviceClient.from('verification_codes')
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

    await serviceClient.from('verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verification.id);

    return { success: true, message: 'E-posta doğrulandı' };
  } catch (error) {
    console.error('[verifyRegistrationCode] Error:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function completeRegistration(formData: FormData): Promise<AuthResult> {
  const rawPhone = (formData.get('phone') as string) || '';
  const validated = registerCompleteSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: rawPhone,
    isCorporate: formData.get('isCorporate') === 'true',
    companyName: formData.get('companyName') || undefined,
    taxNumber: formData.get('taxNumber') || undefined,
    taxOffice: formData.get('taxOffice') || undefined,
    acceptTerms: formData.get('acceptTerms') === 'true',
    newsletterConsent: formData.get('newsletterConsent') === 'true',
  });

  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { email, password, firstName, lastName, phone, isCorporate, companyName, taxNumber, taxOffice, newsletterConsent } = validated.data;
  const fullName = `${firstName} ${lastName}`.trim();

  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch {
    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }

  try {
    const { data: verification } = await serviceClient
      .from('verification_codes')
      .select('used_at')
      .eq('email', email.toLowerCase())
      .eq('type', 'registration')
      .not('used_at', 'is', null)
      .order('used_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verification?.used_at) {
      return { success: false, error: 'E-posta doğrulaması bulunamadı. Lütfen tekrar başlayın.' };
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (new Date(verification.used_at) < oneHourAgo) {
      return { success: false, error: 'Doğrulama süresi doldu. Lütfen tekrar başlayın.' };
    }
  } catch {
    return { success: false, error: 'Doğrulama kodu geçersiz. Lütfen tekrar başlayın.' };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }

  let signUpResult;
  try {
    signUpResult = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: { full_name: fullName, first_name: firstName, last_name: lastName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
  } catch (e) {
    console.error('[completeRegistration] signUp threw:', e);
    return { success: false, error: 'Kayıt başarısız oldu. Lütfen tekrar deneyin.' };
  }

  const { data, error } = signUpResult;

  if (error) {
    return { success: false, error: error.message.includes('already registered') ? 'Bu e-posta adresi zaten kayıtlı' : `Kayıt başarısız: ${error.message}` };
  }

  if (!data.user) {
    return { success: false, error: 'Kayıt başarısız oldu' };
  }

  try {
    await serviceClient.from('users').upsert({
      id: data.user.id,
      email: email.toLowerCase(),
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone,
      is_corporate: isCorporate,
      company_name: companyName || null,
      tax_number: taxNumber || null,
      tax_office: taxOffice || null,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      terms_accepted_at: new Date().toISOString(),
      preferences: { newsletter: newsletterConsent },
    });
  } catch (e) {
    console.error('[completeRegistration] upsert failed:', e);
  }

  try {
    await serviceClient.auth.admin.updateUserById(data.user.id, { email_confirm: true });
  } catch (e) {
    console.error('[completeRegistration] auto-confirm failed:', e);
  }

  mailService.sendWelcomeEmail(email, fullName).catch(e => console.error('[completeRegistration] Welcome email failed:', e));

  try {
    await logAuthEvent('REGISTER_SUCCESS', data.user.id, email);
  } catch (e) {
    console.error('[completeRegistration] audit log failed:', e);
  }

  return { success: true, message: 'Kayıt başarılı! Hoş geldiniz.' };
}
