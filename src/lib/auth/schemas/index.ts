import { z } from 'zod';

const phoneRegex = /^[\d\s\+\-\(\)]{8,20}$/;
function phoneDigits(val: string) { return val.replace(/\D/g, ''); }
const phoneSchema = z.string()
  .regex(phoneRegex, 'Geçerli bir telefon numarası giriniz')
  .refine(val => phoneDigits(val).length >= 8, 'En az 8 rakam giriniz')
  .refine(val => phoneDigits(val).length <= 15, 'En fazla 15 rakam girebilirsiniz');

const passwordSchema = z.string()
  .min(8, 'Şifre en az 8 karakter olmalıdır')
  .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
  .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
  .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir');

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

export const registerEmailSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
});

export const registerCompleteSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: passwordSchema,
  firstName: z.string().min(1, 'Ad gereklidir').max(100, 'Ad çok uzun'),
  lastName: z.string().min(1, 'Soyad gereklidir').max(100, 'Soyad çok uzun'),
  phone: phoneSchema,
  isCorporate: z.boolean(),
  companyName: z.string().max(200, 'Firma adı çok uzun').optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  acceptTerms: z.literal(true, { message: 'Kullanım koşullarını kabul etmelisiniz' }),
  newsletterConsent: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Doğrulama kodu 6 haneli olmalıdır'),
});

export const twoFactorToggleSchema = z.object({
  enabled: z.boolean(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'Ad gereklidir').max(100, 'Ad çok uzun'),
  lastName: z.string().min(1, 'Soyad gereklidir').max(100, 'Soyad çok uzun'),
  phone: phoneSchema,
});

export const totpSetupSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
});
