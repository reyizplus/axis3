'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { requestPasswordReset } from '@/lib/auth/actions/password';
import { forgotPasswordSchema } from '@/lib/auth/schemas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = (values: ForgotPasswordFormValues) => {
    startTransition(async () => {
      const result = await requestPasswordReset(values.email);
      if (result.success) {
        setSent(true);
        toast.success(result.message || 'E-posta gönderildi');
      } else {
        toast.error(result.error);
      }
    });
  };

  if (sent) {
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
          <h3 className="text-lg font-semibold">E-posta Gönderildi</h3>
          <p className="text-sm text-muted-foreground">
            Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.
            Lütfen gelen kutunuzu kontrol edin.
          </p>
        </div>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Giriş Sayfasına Dön
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
        <div className="text-center space-y-2 mb-6">
          <p className="text-sm text-muted-foreground">
            Şifrenizi sıfırlamak için kayıtlı e-posta adresinizi girin.
            Size bir sıfırlama bağlantısı göndereceğiz.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-email">E-posta Adresi</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="reset-email"
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

        <Button type="submit" disabled={isPending} className="w-full" size="lg">
          {isPending ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Gönderiliyor...
            </>
          ) : (
            'Şifre Sıfırlama Bağlantısı Gönder'
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Giriş Sayfasına Dön
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
