'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { signIn } from '@/lib/auth/actions/login';
import { loginSchema } from '@/lib/auth/schemas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function LoginForm({ onSuccess, redirectTo = '/dashboard' }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = (values: LoginFormValues) => {
    setServerError('');
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('email', values.email);
        formData.set('password', values.password);
        const result = await signIn(formData);

        if (!result.success) {
          setServerError(result.error);
          toast.error(result.error);
          return;
        }

        if (result.data?.requiresTwoFactor) {
          const email = result.data.email || values.email;
          router.push(`/login/verify?email=${encodeURIComponent(email)}`);
          return;
        }

        toast.success('Giriş başarılı!');
        if (onSuccess) {
          onSuccess();
        } else {
          const rawCallback = searchParams.get('redirectTo');
          const callbackUrl = rawCallback && (rawCallback.startsWith('/') && !rawCallback.startsWith('//')) ? rawCallback : redirectTo;
          router.push(callbackUrl);
          router.refresh();
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
          if (onSuccess) onSuccess();
          return;
        }
        setServerError('Bir hata oluştu. Lütfen tekrar deneyin.');
        toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    });
  };

  const rawRedirectParam = searchParams.get('redirectTo');
  const redirectParam = rawRedirectParam && (rawRedirectParam.startsWith('/') && !rawRedirectParam.startsWith('//')) ? rawRedirectParam : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="login-email">E-posta</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="ornek@email.com"
              disabled={isPending}
              className={cn('pl-10', errors.email && 'border-destructive')}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-xs text-destructive"
            >
              {errors.email.message}
            </motion.p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Şifre</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Şifremi Unuttum
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-xs text-destructive"
            >
              {errors.password.message}
            </motion.p>
          )}
        </div>

        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span>{serverError}</span>
          </motion.div>
        )}

        <Button type="submit" disabled={isPending} className="w-full" size="lg">
          {isPending ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Giriş yapılıyor...
            </>
          ) : (
            'Giriş Yap'
          )}
        </Button>

        <motion.p
          className="text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Hesabınız yok mu?{' '}
          <Link
            href={{ pathname: '/register', query: redirectParam ? { redirectTo: redirectParam } : undefined }}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Kayıt Ol
          </Link>
        </motion.p>
      </form>
    </motion.div>
  );
}
