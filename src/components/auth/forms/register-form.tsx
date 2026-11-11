'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { sendRegistrationCode, verifyRegistrationCode, completeRegistration } from '@/lib/auth/actions/register';
import { registerEmailSchema, registerCompleteSchema } from '@/lib/auth/schemas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OTPInput } from '@/components/auth/ui/otp-input';
import { PasswordStrength, PasswordRequirements } from '@/components/auth/ui/password-strength';
import { CountdownTimer } from '@/components/auth/ui/countdown-timer';
import { Loader2, Mail, User, Phone, Lock, Eye, EyeOff, Building2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'email' | 'verify' | 'profile';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCorporate, setIsCorporate] = useState(false);
  const [resendKey, setResendKey] = useState(0);
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileForm = useForm<z.infer<typeof registerCompleteSchema>>({
    resolver: zodResolver(registerCompleteSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      isCorporate: false,
      companyName: '',
      taxNumber: '',
      taxOffice: '',
      acceptTerms: false as unknown as true,
      newsletterConsent: false,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors: profileErrors },
  } = profileForm;

  const password = watch('password');

  const handleSendCode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get('email') as string;

    const result = registerEmailSchema.safeParse({ email: emailValue });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const res = await sendRegistrationCode(emailValue);
      if (res.success) {
        setEmail(emailValue);
        setStep('verify');
        setResendKey(prev => prev + 1);
        toast.success('Doğrulama kodu gönderildi');
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleVerifyCode = (code: string) => {
    startTransition(async () => {
      const res = await verifyRegistrationCode(email, code);
      if (res.success) {
        setStep('profile');
        setValue('email', email);
        toast.success('E-posta doğrulandı');
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleResendCode = () => {
    startTransition(async () => {
      const res = await sendRegistrationCode(email);
      if (res.success) {
        setResendKey(prev => prev + 1);
        toast.success('Yeni doğrulama kodu gönderildi');
      } else {
        toast.error(res.error);
      }
    });
  };

  const onCompleteProfile = (values: z.infer<typeof registerCompleteSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('email', email);
        formData.set('password', values.password);
        formData.set('firstName', values.firstName);
        formData.set('lastName', values.lastName);
        formData.set('phone', values.phone);
        formData.set('isCorporate', String(values.isCorporate));
        if (values.companyName) formData.set('companyName', values.companyName);
        if (values.taxNumber) formData.set('taxNumber', values.taxNumber);
        if (values.taxOffice) formData.set('taxOffice', values.taxOffice);
        formData.set('acceptTerms', String(values.acceptTerms));
        formData.set('newsletterConsent', String(values.newsletterConsent));

        const result = await completeRegistration(formData);
        if (result.success) {
          toast.success('Kayıt başarılı! Hoş geldiniz.');
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/dashboard');
            router.refresh();
          }
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
          if (onSuccess) onSuccess();
          return;
        }
        toast.error('Bir hata oluştu');
      }
    });
  };

  const steps = [
    { key: 'email', label: 'E-posta', completed: step !== 'email' },
    { key: 'verify', label: 'Doğrulama', completed: step === 'profile' },
    { key: 'profile', label: 'Profil', completed: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-center mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300',
                  s.completed
                    ? 'bg-primary text-primary-foreground'
                    : s.key === step
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {s.completed ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:inline transition-colors',
                  s.key === step || s.completed ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-8 sm:w-16 h-0.5 mx-2 transition-colors duration-300',
                  s.completed ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.form
            key="email-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSendCode}
            className="space-y-5"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="reg-email">E-posta Adresi</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@email.com"
                  disabled={isPending}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full" size="lg">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Kod gönderiliyor...
                </>
              ) : (
                <>
                  Doğrulama Kodu Gönder
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Zaten hesabınız var mı?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Giriş Yap
              </Link>
            </p>
          </motion.form>
        )}

        {step === 'verify' && (
          <motion.div
            key="verify-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{email}</span> adresine gönderilen
                6 haneli doğrulama kodunu girin
              </p>
            </div>

            <OTPInput
              key={resendKey}
              length={6}
              onComplete={handleVerifyCode}
              disabled={isPending}
              autoFocus
            />

            <div className="flex flex-col items-center gap-3">
              <CountdownTimer
                key={resendKey}
                initialSeconds={120}
                onExpire={() => {}}
                showProgress
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={handleResendCode}
                className="text-xs"
              >
                {isPending ? (
                  <Loader2 className="animate-spin mr-2 h-3 w-3" />
                ) : null}
                Kodu Tekrar Gönder
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('email')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri Dön
            </Button>
          </motion.div>
        )}

        {step === 'profile' && (
          <motion.form
            key="profile-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit(onCompleteProfile)}
            className="space-y-5"
            noValidate
          >
            <input type="hidden" {...register('email')} />
            <input type="hidden" {...register('isCorporate')} value={String(isCorporate)} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="firstName"
                    placeholder="Ad"
                    disabled={isPending}
                    className={cn('pl-10', profileErrors.firstName && 'border-destructive')}
                    {...register('firstName')}
                  />
                </div>
                {profileErrors.firstName && (
                  <p className="text-xs text-destructive">{profileErrors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="lastName"
                    placeholder="Soyad"
                    disabled={isPending}
                    className={cn('pl-10', profileErrors.lastName && 'border-destructive')}
                    {...register('lastName')}
                  />
                </div>
                {profileErrors.lastName && (
                  <p className="text-xs text-destructive">{profileErrors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="5XX XXX XX XX"
                  disabled={isPending}
                  className={cn('pl-10', profileErrors.phone && 'border-destructive')}
                  {...register('phone')}
                />
              </div>
              {profileErrors.phone && (
                <p className="text-xs text-destructive">{profileErrors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className={cn('pl-10 pr-10', profileErrors.password && 'border-destructive')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {profileErrors.password && (
                <p className="text-xs text-destructive">{profileErrors.password.message}</p>
              )}
              <PasswordStrength password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={isPending}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn('pl-10', confirmPassword && password !== confirmPassword && 'border-destructive')}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Şifreler eşleşmiyor</p>
              )}
              <PasswordRequirements password={password} confirmPassword={confirmPassword} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCorporate"
                checked={isCorporate}
                onChange={(e) => setIsCorporate(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="isCorporate" className="text-sm cursor-pointer">
                <Building2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Kurumsal hesap oluştur
              </Label>
            </div>

            <AnimatePresence>
              {isCorporate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Firma Adı</Label>
                    <Input
                      id="companyName"
                      placeholder="Firma adı"
                      disabled={isPending}
                      {...register('companyName')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taxNumber">Vergi Numarası</Label>
                      <Input
                        id="taxNumber"
                        placeholder="Vergi no"
                        disabled={isPending}
                        {...register('taxNumber')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxOffice">Vergi Dairesi</Label>
                      <Input
                        id="taxOffice"
                        placeholder="Vergi dairesi"
                        disabled={isPending}
                        {...register('taxOffice')}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  {...register('acceptTerms')}
                />
                <Label htmlFor="acceptTerms" className="text-sm cursor-pointer leading-5">
                  <Link href="/terms" className="text-primary hover:underline">Kullanım Koşulları</Link>
                  {' '}ve{' '}
                  <Link href="/privacy" className="text-primary hover:underline">Gizlilik Politikası</Link>
                  {' '}nı okudum ve kabul ediyorum
                </Label>
              </div>
              {profileErrors.acceptTerms && (
                <p className="text-xs text-destructive">{profileErrors.acceptTerms.message}</p>
              )}

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="newsletterConsent"
                  className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  {...register('newsletterConsent')}
                />
                <Label htmlFor="newsletterConsent" className="text-sm text-muted-foreground cursor-pointer leading-5">
                  Kampanya ve duyurulardan e-posta ile haberdar olmak istiyorum
                </Label>
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full" size="lg">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Hesap oluşturuluyor...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Hesap Oluştur
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('verify')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri Dön
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
