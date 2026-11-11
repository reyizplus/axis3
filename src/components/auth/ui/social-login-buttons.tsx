'use client';

import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Globe, Code2 } from 'lucide-react';

interface SocialLoginButtonsProps {
  mode?: 'login' | 'register';
  disabled?: boolean;
}

export function SocialLoginButtons({ mode = 'login', disabled = false }: SocialLoginButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('redirectTo');
  const callbackUrl = rawCallback && (rawCallback.startsWith('/') && !rawCallback.startsWith('//')) ? rawCallback : '/dashboard';

  const handleGoogleLogin = () => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ provider: 'google', callbackUrl, action: mode });
        const response = await fetch(`/api/auth/social?${params.toString()}`, { method: 'POST' });
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error('Giriş başlatılamadı');
        }
      } catch {
        toast.error('Bir hata oluştu');
      }
    });
  };

  const handleGithubLogin = () => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ provider: 'github', callbackUrl, action: mode });
        const response = await fetch(`/api/auth/social?${params.toString()}`, { method: 'POST' });
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error('Giriş başlatılamadı');
        }
      } catch {
        toast.error('Bir hata oluştu');
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {mode === 'login' ? 'veya giriş yap' : 'veya kayıt ol'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={disabled || isPending}
          onClick={handleGoogleLogin}
          className="w-full"
        >
          <Globe className="w-4 h-4 mr-2" />
          Google
        </Button>
        <Button
          variant="outline"
          disabled={disabled || isPending}
          onClick={handleGithubLogin}
          className="w-full"
        >
          <Code2 className="w-4 h-4 mr-2" />
          GitHub
        </Button>
      </div>
    </div>
  );
}
