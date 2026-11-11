'use client';

import { useState, useEffect, useCallback } from 'react';
import { toggle2FA } from '@/lib/auth/actions/two-factor';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';

interface TwoFactorToggleProps {
  userId: string;
}

export function TwoFactorToggle({ userId }: TwoFactorToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!userId) return;

    try {
      const supabase = createClient();
      const { data } = await (supabase.from('users') as any)
        .select('two_factor_enabled')
        .eq('id', userId)
        .maybeSingle() as { data: { two_factor_enabled: boolean } | null; error: any };

      if (data) {
        setEnabled(data.two_factor_enabled || false);
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStatus();
  }, [userId, loadStatus]);

  async function handleToggle() {
    setToggling(true);
    try {
      const newStatus = !enabled;
      const result = await toggle2FA(newStatus);

      if (result.success) {
        setEnabled(newStatus);
        toast.success(result.message || '2FA ayarı güncellendi');
      } else {
        toast.error(result.error || '2FA ayarı güncellenemedi');
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg border glass-light dark:glass">
        <div className="flex items-center gap-3">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">
              {enabled ? '2FA Aktif' : '2FA Devre Dışı'}
            </p>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? 'Giriş yaparken email ile doğrulama kodu gerekir'
                : 'Hesabınıza ekstra güvenlik katmanı ekleyin'}
            </p>
          </div>
        </div>
        <Button
          variant={enabled ? 'destructive' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={toggling}
        >
          {toggling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Güncelleniyor...
            </>
          ) : enabled ? (
            'Devre Dışı Bırak'
          ) : (
            'Aktif Et'
          )}
        </Button>
      </div>

      {enabled && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✓ İki faktörlü doğrulama aktif. Giriş yaparken email adresinize gönderilen 6 haneli kodu girmeniz gerekecek.
          </p>
        </div>
      )}

      {!enabled && (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            2FA&rsquo;yı aktif ettiğinizde, her giriş yaptığınızda email adresinize gönderilen 6 haneli doğrulama kodunu girmeniz gerekecek. Bu, hesabınıza yetkisiz erişimi önler.
          </p>
        </div>
      )}
    </div>
  );
}
