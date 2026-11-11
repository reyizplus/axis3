'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth/actions/login';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LoginDialog({ open, onOpenChange, onSuccess }: LoginDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await signIn(formData);
        if (!result.success) {
          setError(result.error);
          toast.error(result.error);
        } else {
          if (result.data?.requiresTwoFactor) {
            onOpenChange(false);
            router.push(`/login/verify?email=${encodeURIComponent(result.data.email || '')}`);
          } else {
            onOpenChange(false);
            toast.success('Giriş başarılı!');
            onSuccess?.();
            router.refresh();
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
          onOpenChange(false);
          onSuccess?.();
          return;
        }
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Giriş Yap</DialogTitle>
          <DialogDescription>
            Sepete ürün eklemek için giriş yapın
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dialog-email">E-posta</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="dialog-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                placeholder="ornek@email.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dialog-password">Şifre</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
                onClick={() => onOpenChange(false)}
              >
                Unuttum
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="dialog-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isPending}
                placeholder="••••••••"
                className="pl-10"
              />
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
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
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">veya</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Hesabınız yok mu?</p>
          <Button variant="outline" asChild className="w-full">
            <Link href="/register" onClick={() => onOpenChange(false)}>
              Ücretsiz Hesap Oluştur
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
