'use client';

export const dynamic = 'force-dynamic';

import { useState, useTransition, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { completeRegistration } from '@/lib/auth/actions/register';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Lock, CheckCircle2, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { PasswordStrength } from '@/components/auth/ui/password-strength';

function RegisterCompleteForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const verified = searchParams.get('verified');

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (ready && (!email || verified !== 'true')) {
      window.location.href = '/register';
    }
  }, [ready, email, verified]);

  useEffect(() => {
    if (submitted) {
      const timeout = setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [submitted]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      toast.error('Şifre en az 8 karakter olmalıdır');
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set('email', email!);
    formData.set('password', password);

    startTransition(async () => {
      try {
        const result = await completeRegistration(formData);
        if (!result.success) {
          setError(result.error || 'Kayıt başarısız');
          toast.error(result.error || 'Kayıt başarısız');
        } else {
          toast.success('Hesabınız oluşturuldu! Hoş geldiniz.');
          setSubmitted(true);
        }
      } catch {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    });
  };

  if (!ready) return null;

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Hesabınız Oluşturuldu!</h1>
          <p className="text-sm text-muted-foreground">Dashboard&apos;a yönlendiriliyorsunuz...</p>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-xl font-bold">Hesabınızı Tamamlayın</h1>
        <p className="text-sm text-muted-foreground">E-posta adresiniz doğrulandı. Kalan bilgilerinizi girin.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">E-posta Adresi</p>
              <p className="text-sm font-medium text-foreground truncate">{email}</p>
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full flex-shrink-0">Doğrulandı</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Kişisel Bilgiler</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-medium">Ad <span className="text-destructive">*</span></Label>
              <Input id="firstName" name="firstName" type="text" autoComplete="given-name" required disabled={isPending} placeholder="Adınız" className="h-11" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-medium">Soyad <span className="text-destructive">*</span></Label>
              <Input id="lastName" name="lastName" type="text" autoComplete="family-name" required disabled={isPending} placeholder="Soyadınız" className="h-11" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Şifre Belirleyin</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">Şifre <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required disabled={isPending} placeholder="En az 8 karakter" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-medium">Şifre Tekrar <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required disabled={isPending} placeholder="Şifrenizi tekrar girin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10 h-11" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl">{error}</div>}

        <Button type="submit" disabled={isPending} className="w-full h-12 text-base font-semibold" size="lg">
          {isPending ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Hesap oluşturuluyor...</> : <><ShieldCheck className="mr-2 h-5 w-5" /> Hesabı Oluştur</>}
        </Button>
      </form>
    </div>
  );
}

export default function RegisterCompletePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RegisterCompleteForm />
    </Suspense>
  );
}
