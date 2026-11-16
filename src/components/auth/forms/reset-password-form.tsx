'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { validateResetToken, resetPassword } from '@/lib/auth/actions/password';
import { resetPasswordSchema } from '@/lib/auth/schemas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrength, PasswordRequirements } from '@/components/auth/ui/password-strength';
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Mail,
  CheckCircle2,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [accountEmail, setAccountEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const { register, handleSubmit, watch, formState: { errors } } = form;
  const password = watch('password');

  useEffect(() => {
    if (!ref) {
      setTokenValid(false);
      setChecking(false);
      return;
    }

    startTransition(async () => {
      const result = await validateResetToken(ref);
      setTokenValid(result.valid);
      setAccountEmail(result.email || '');
      setChecking(false);
    });
  }, [ref]);

  const onSubmit = (values: ResetPasswordFormValues) => {
    if (values.password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    startTransition(async () => {
      const result = await resetPassword(ref!, values.password);
      if (result.success) {
        toast.success('Şifreniz başarıyla güncellendi');
        setDone(true);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Geçersiz Bağlantı</h3>
          <p className="text-sm text-muted-foreground">
            Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
            Lütfen yeni bir sıfırlama bağlantısı talep edin.
          </p>
        </div>
        <Button asChild className="mt-4">
          <Link href="/forgot-password">Yeni Bağlantı Talep Et</Link>
        </Button>
      </motion.div>
    );
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Şifreniz Güncellendi</h3>
          <p className="text-sm text-muted-foreground">
            {accountEmail ? (
              <>
                <span className="font-medium text-foreground">{accountEmail}</span> hesabının
                şifresi başarıyla değiştirildi.
              </>
            ) : (
              'Hesabınızın şifresi başarıyla değiştirildi.'
            )}{' '}
            Güvenlik için tüm cihazlardaki oturumlar kapatıldı.
          </p>
        </div>
        <Button asChild className="mt-4">
          <Link href="/login">
            Giriş Yap
          </Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold">Yeni Şifre Belirleyin</h3>
          <p className="text-sm text-muted-foreground">
            Hesabınız için güçlü ve daha önce kullanmadığınız bir şifre seçin.
          </p>
        </div>

        {accountEmail && (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Şifresi sıfırlanan hesap
                </p>
                <p className="truncate text-sm font-medium">{accountEmail}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Bu bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="new-password">Yeni Şifre</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={isPending}
              className={cn('pl-10 pr-10', errors.password && 'border-destructive')}
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
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={isPending}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                'pl-10',
                confirmPassword && password !== confirmPassword && 'border-destructive'
              )}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">Şifreler eşleşmiyor</p>
          )}
        </div>

        <PasswordRequirements password={password} confirmPassword={confirmPassword} />

        <Button type="submit" disabled={isPending} className="w-full" size="lg">
          {isPending ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Şifre güncelleniyor...
            </>
          ) : (
            'Şifreyi Güncelle'
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Giriş sayfasına dön
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
