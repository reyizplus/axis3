'use client';

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { quotaService, type QuotaInfo } from '@/lib/services/quota-service';
import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';

export interface QuotaDisplayRef {
  refresh: () => Promise<void>;
  canUpload: () => boolean;
}

interface QuotaDisplayProps {
  onQuotaChange?: (canUpload: boolean) => void;
}

export const QuotaDisplay = forwardRef<QuotaDisplayRef, QuotaDisplayProps>(
  ({ onQuotaChange }, ref) => {
    const { user } = useAuth();
    const [quota, setQuota] = useState<QuotaInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      loadQuota();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    async function loadQuota() {
      if (!user) return;

      setLoading(true);
      const result = await quotaService.getQuotaInfo(user.id);
      
      if (result.success && result.quota) {
        setQuota(result.quota);
        const canUpload = result.quota.used < result.quota.total;
        onQuotaChange?.(canUpload);
      }
      setLoading(false);
    }

    useImperativeHandle(ref, () => ({
      refresh: loadQuota,
      canUpload: () => {
        if (!quota) return false;
        return quota.used < quota.total;
      },
    }));

    if (loading || !quota) {
      return (
        <Card className="glass-light dark:glass">
          <CardContent className="py-6">
            <div className="h-20 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      );
    }

    const breakdown = quotaService.getQuotaBreakdown(quota);
    const usagePercent = quota.isUnlimited ? 0 : (quota.used / quota.total) * 100;
    const isNearLimit = !quota.isUnlimited && usagePercent >= 80;
    const isFull = !quota.isUnlimited && quota.used >= quota.total;

    return (
      <Card className="glass-light dark:glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Model Yükleme Kotası
            </CardTitle>
            <Badge variant={quota.isUnlimited ? 'outline' : isFull ? 'destructive' : isNearLimit ? 'secondary' : 'default'}>
              {quota.isUnlimited ? 'Sınırsız' : `${quota.used} / ${quota.total}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {quota.isUnlimited ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Sınırsız yükleme hakkı</span>
              </div>
            ) : (
              <>
                <Progress value={usagePercent} className="h-2" />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{quota.total - quota.used} kota kaldı</span>
                  <span>%{Math.round(usagePercent)} kullanıldı</span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="text-xs text-muted-foreground">Temel</div>
              <div className="font-semibold text-primary">{breakdown.base}</div>
            </div>
            <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
              <div className="text-xs text-muted-foreground">Siparişler</div>
              <div className="font-semibold text-green-600">+{breakdown.fromOrders}</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <div className="text-xs text-muted-foreground">Bonus</div>
              <div className="font-semibold text-blue-600">+{breakdown.bonus}</div>
            </div>
          </div>

          {isFull && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Kotanız doldu! Yeni model yükleyebilmek için sipariş vermeniz gerekiyor.
              </AlertDescription>
            </Alert>
          )}

          {isNearLimit && !isFull && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                Kotanız dolmak üzere. Sipariş vererek daha fazla kota kazanabilirsiniz.
              </AlertDescription>
            </Alert>
          )}

          {!quota.isUnlimited && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span>Her sipariş ile +3 kota kazanın</span>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard/orders">
                  Siparişlerime Git
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

QuotaDisplay.displayName = 'QuotaDisplay';
