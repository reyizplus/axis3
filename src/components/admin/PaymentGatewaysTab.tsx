'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Building2, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface PaymentGateway {
  id: string; gateway_type: 'iyzico' | 'bank_transfer'; display_name: string;
  description: string; is_enabled: boolean; display_order: number; icon_name: string;
  configuration: Record<string, any>; metadata: { badge?: string; badge_color?: string; processing_time?: string; features?: string[]; };
}

export default function PaymentGatewaysTab() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, { valid: boolean; message: string }>>({});

  useEffect(() => { loadGateways(); }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/payment-gateways');
      const data = await res.json();
      if (data.gateways) setGateways(data.gateways);
    } catch { toast.error('Ödeme yöntemleri yüklenemedi'); } finally { setLoading(false); }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/payment-gateways/${id}/toggle`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isEnabled: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'LAST_GATEWAY') toast.error('Son Aktif Ödeme Yöntemi', { description: 'En az bir ödeme yöntemi aktif olmalıdır.' });
        else toast.error(data.error || 'İşlem başarısız');
        return;
      }
      setGateways(prev => prev.map(g => g.id === id ? { ...g, is_enabled: !currentStatus } : g));
      toast.success(!currentStatus ? 'Ödeme yöntemi aktifleştirildi' : 'Ödeme yöntemi devre dışı bırakıldı');
    } catch { toast.error('İşlem başarısız oldu'); }
  };

  const handleValidate = async (gatewayType: string) => {
    try {
      setValidating(prev => ({ ...prev, [gatewayType]: true }));
      if (gatewayType === 'iyzico') {
        const res = await fetch('/api/admin/payment-gateways/validate-iyzico', { method: 'POST' });
        const data = await res.json();
        setValidationStatus(prev => ({ ...prev, [gatewayType]: { valid: data.valid, message: data.message } }));
        if (data.valid) toast.success('iyzico yapılandırması geçerli'); else toast.error(data.message);
      } else if (gatewayType === 'bank_transfer') {
        const res = await fetch('/api/admin/bank-accounts');
        const data = await res.json();
        const hasActiveAccounts = data.accounts?.some((acc: any) => acc.is_active);
        setValidationStatus(prev => ({ ...prev, [gatewayType]: { valid: hasActiveAccounts, message: hasActiveAccounts ? 'Aktif banka hesapları mevcut' : 'Aktif banka hesabı bulunamadı' } }));
        if (hasActiveAccounts) toast.success('Banka hesapları yapılandırılmış'); else toast.error('Aktif banka hesabı bulunamadı');
      }
    } catch { toast.error('Doğrulama başarısız oldu'); } finally { setValidating(prev => ({ ...prev, [gatewayType]: false })); }
  };

  const getStatusBadge = (gateway: PaymentGateway) => {
    const status = validationStatus[gateway.gateway_type];
    if (!gateway.is_enabled) return <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 border-gray-500/20 text-[10px]">Devre Dışı</Badge>;
    if (!status) return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Aktif</Badge>;
    if (status.valid) return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Yapılandırılmış</Badge>;
    return <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Yapılandırma Gerekli</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const enabledCount = gateways.filter(g => g.is_enabled).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Aktif Ödeme Yöntemleri</p>
              <p className="text-xl sm:text-3xl font-bold text-primary">{enabledCount} / {gateways.length}</p>
            </div>
            {enabledCount === 0 && <div className="flex items-center gap-2 text-orange-600 text-xs sm:text-sm"><AlertCircle className="h-4 w-4 shrink-0" /><span className="font-medium">Hiçbiri aktif değil</span></div>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 sm:space-y-4">
        {gateways.map((gateway, index) => {
          const Icon = gateway.icon_name === 'CreditCard' ? CreditCard : Building2;
          const isValidating = validating[gateway.gateway_type];
          const status = validationStatus[gateway.gateway_type];
          return (
            <motion.div key={gateway.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="rounded-lg bg-primary/10 p-2 sm:p-3 shrink-0">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CardTitle className="text-sm sm:text-base truncate max-w-[120px] sm:max-w-[200px]">{gateway.display_name}</CardTitle>
                          {getStatusBadge(gateway)}
                        </div>
                        <CardDescription className="text-xs mt-0.5">{gateway.description}</CardDescription>
                      </div>
                    </div>
                    <Switch checked={gateway.is_enabled} onCheckedChange={() => handleToggle(gateway.id, gateway.is_enabled)} className="shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
                  {gateway.metadata.features && gateway.metadata.features.length > 0 && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-1.5">Özellikler:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {gateway.metadata.features.map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] h-4 px-1">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleValidate(gateway.gateway_type)} disabled={isValidating} className="text-xs">
                      {isValidating ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Kontrol Ediliyor...</> : <><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Yapılandırmayı Kontrol Et</>}
                    </Button>
                    {gateway.gateway_type === 'bank_transfer' && (
                      <Button variant="outline" size="sm" asChild className="text-xs">
                        <Link href="/admin/bank-accounts"><Building2 className="mr-1.5 h-3.5 w-3.5" />Banka Hesaplarını Yönet</Link>
                      </Button>
                    )}
                  </div>
                  {status && (
                    <div className={`p-3 rounded-xl border ${status.valid ? 'bg-green-500/5 border-green-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                      <div className="flex items-start gap-2">
                        {status.valid ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />}
                        <p className="text-xs sm:text-sm text-muted-foreground">{status.message}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {enabledCount === 0 && (
        <Card className="border-border/50 shadow-sm overflow-hidden border-orange-500/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-orange-600 mb-0.5">Uyarı: Hiçbir Ödeme Yöntemi Aktif Değil</p>
                <p className="text-xs text-muted-foreground">Kullanıcılar sipariş veremeyecek. En az bir ödeme yöntemini aktifleştirin.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
