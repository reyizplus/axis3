'use client';

export const dynamic = 'force-dynamic';

import { useState, useTransition, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyEmail, resendVerificationCode } from '@/lib/auth/actions/email';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { OTPInput } from '@/components/auth/ui/otp-input';
import { CountdownTimer } from '@/components/auth/ui/countdown-timer';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [isPending, startTransition] = useTransition();
  const [isResending, setIsResending] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (verified) {
      const timeout = setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [verified]);

  if (!ready) return null;

  if (verified) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">E-posta Doğrulandı!</h1>
          <p className="text-sm text-muted-foreground">Dashboard&apos;a yönlendiriliyorsunuz...</p>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleVerify = (verificationCode: string) => {
    setError('');
    if (isExpired) { setError('Kod süresi doldu. Lütfen yeni kod isteyin.'); return; }

    startTransition(async () => {
      try {
        const result = await verifyEmail(verificationCode);
        if (!result.success) {
          setError(result.error || 'Doğrulama başarısız');
          toast.error(result.error || 'Doğrulama başarısız');
        } else {
          toast.success('E-posta doğrulandı!');
          setVerified(true);
        }
      } catch {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    });
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const result = await resendVerificationCode();
      if (!result.success) toast.error(result.error || 'Kod gönderilemedi');
      else toast.success('Yeni doğrulama kodu gönderildi!');
    } catch { toast.error('Bir hata oluştu. Lütfen tekrar deneyin.'); }
    finally { setIsResending(false); }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
          <Mail className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-xl font-bold">E-posta Doğrulama</h1>
        <p className="text-sm text-muted-foreground">
          {email ? (
            <><span className="font-medium text-foreground">{email}</span> adresine gönderilen 6 haneli kodu girin</>
          ) : (
            'E-posta adresinize gönderilen 6 haneli kodu girin'
          )}
        </p>
      </div>

      <div className="space-y-4">
        <OTPInput length={6} onComplete={handleVerify} onChange={setCode} disabled={isPending || isExpired} error={!!error} autoFocus />
        <CountdownTimer initialSeconds={900} onExpire={() => setIsExpired(true)} showProgress />
      </div>

      {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl text-center">{error}</div>}

      <Button type="button" onClick={() => handleVerify(code)} className="w-full h-12 text-base font-semibold" disabled={isPending || code.length !== 6 || isExpired} size="lg">
        {isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Doğrulanıyor...</> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Doğrula</>}
      </Button>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Kod gelmedi mi?</p>
        <Button type="button" variant="outline" size="sm" onClick={handleResend} disabled={isResending} className="h-10">
          {isResending ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Gönderiliyor...</> : 'Yeni Kod Gönder'}
        </Button>
      </div>

      <div className="text-center pt-2 border-t border-border/50">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Giriş sayfasına dön</Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
