'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyTOTPLogin, verifyRecoveryCode, verify2FACode } from '@/lib/auth/actions/two-factor';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { OTPInput } from '@/components/auth/ui/otp-input';
import { CountdownTimer } from '@/components/auth/ui/countdown-timer';
import { Loader2, ShieldCheck, KeyRound, ArrowLeft, Smartphone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

type TwoFactorMethod = 'totp' | 'email' | 'recovery';

interface TwoFactorFormProps {
  email: string;
  method?: TwoFactorMethod;
  onSuccess?: () => void;
}

export function TwoFactorForm({ email, method = 'totp', onSuccess }: TwoFactorFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [currentMethod, setCurrentMethod] = useState<TwoFactorMethod>(method);
  const [recoveryCode, setRecoveryCode] = useState('');

  function getSafeRedirect(defaultPath: string = '/dashboard'): string {
    const raw = searchParams.get('redirectTo');
    return raw && (raw.startsWith('/') && !raw.startsWith('//')) ? raw : defaultPath;
  }

  const handleTOTPSubmit = (code: string) => {
    startTransition(async () => {
      const result = await verifyTOTPLogin(email, code);
      if (result.success) {
        toast.success('Giriş başarılı');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(getSafeRedirect());
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleEmailCodeSubmit = (code: string) => {
    startTransition(async () => {
      const result = await verify2FACode(email, code);
      if (result.success) {
        toast.success('Giriş başarılı');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(getSafeRedirect());
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRecoveryCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim()) {
      toast.error('Kurtarma kodu girin');
      return;
    }

    startTransition(async () => {
      const result = await verifyRecoveryCode(email, recoveryCode.trim());
      if (result.success) {
        toast.success('Giriş başarılı');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(getSafeRedirect());
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">İki Adımlı Doğrulama</h3>
        <p className="text-sm text-muted-foreground">
          {currentMethod === 'totp' && 'Google Authenticator uygulamasındaki kodu girin'}
          {currentMethod === 'email' && `E-posta adresinize gönderilen kodu girin`}
          {currentMethod === 'recovery' && 'Kurtarma kodlarınızdan birini girin'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant={currentMethod === 'totp' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentMethod('totp')}
          className="gap-2"
        >
          <Smartphone className="h-4 w-4" />
          TOTP
        </Button>
        <Button
          type="button"
          variant={currentMethod === 'email' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentMethod('email')}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          E-posta
        </Button>
        <Button
          type="button"
          variant={currentMethod === 'recovery' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentMethod('recovery')}
          className="gap-2"
        >
          <KeyRound className="h-4 w-4" />
          Kurtarma
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {currentMethod === 'totp' && (
          <motion.div
            key="totp"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <OTPInput
              length={6}
              onComplete={handleTOTPSubmit}
              disabled={isPending}
              autoFocus
            />
          </motion.div>
        )}

        {currentMethod === 'email' && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <OTPInput
              length={6}
              onComplete={handleEmailCodeSubmit}
              disabled={isPending}
              autoFocus
            />
            <CountdownTimer initialSeconds={300} onExpire={() => {}} showProgress />
          </motion.div>
        )}

        {currentMethod === 'recovery' && (
          <motion.form
            key="recovery"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleRecoveryCodeSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="recovery-code">Kurtarma Kodu</Label>
              <Input
                id="recovery-code"
                placeholder="XXXXX-XXXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                disabled={isPending}
                className="text-center font-mono tracking-widest"
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full" size="lg">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Doğrulanıyor...
                </>
              ) : (
                'Doğrula'
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <p className="text-center text-sm text-muted-foreground">
        <Button
          variant="link"
          className="text-xs h-auto p-0"
          onClick={() => router.push('/login')}
        >
          <ArrowLeft className="inline h-3 w-3 mr-1" />
          Giriş sayfasına dön
        </Button>
      </p>
    </motion.div>
  );
}
