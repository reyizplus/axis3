'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Package, Truck, CheckCircle2, Clock, AlertCircle, Eye, ArrowRight, Store, PackageCheck,
} from 'lucide-react';

interface OrderData {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 30) return `${diffDays} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

function getEstimatedDelivery(status: string, shippedAt: string | null): string {
  if (status === 'delivered') return 'Teslim edildi';
  if (status === 'shipped' && shippedAt) {
    const shipped = new Date(shippedAt);
    const estimated = new Date(shipped.getTime() + 3 * 24 * 60 * 60 * 1000);
    return estimated.toLocaleDateString('tr-TR');
  }
  return '3-5 iş günü';
}

function getStatusMeta(status: string): { label: string; icon: typeof Package; color: string } {
  const map: Record<string, { label: string; icon: typeof Package; color: string }> = {
    delivered: { label: 'Teslim Edildi', icon: CheckCircle2, color: 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400' },
    shipped: { label: 'Kargoda', icon: Truck, color: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    preparing: { label: 'Hazırlanıyor', icon: Package, color: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
    printing: { label: 'Baskıda', icon: Package, color: 'border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    quality_check: { label: 'Kalite Kontrolü', icon: PackageCheck, color: 'border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    packaging: { label: 'Paketleniyor', icon: Package, color: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    payment_received: { label: 'Ödeme Alındı', icon: Clock, color: 'border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-400' },
    pending: { label: 'Beklemede', icon: Clock, color: 'border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-400' },
    cancelled: { label: 'İptal Edildi', icon: AlertCircle, color: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400' },
    refunded: { label: 'İade Edildi', icon: AlertCircle, color: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400' },
  };
  return map[status] || { label: status, icon: Package, color: 'border-gray-500/20 bg-gray-500/10 text-gray-600' };
}

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    preparing: 'Hazırlanıyor', printing: 'Baskıda', quality_check: 'Kalite Kontrolü',
    packaging: 'Paketleniyor', shipped: 'Kargoda', delivered: 'Teslim Edildi',
    payment_received: 'Ödeme Alındı', pending: 'Beklemede', cancelled: 'İptal Edildi', refunded: 'İade Edildi',
  };
  return m[status] || status;
}

function paymentLabel(method: string | null, status: string): string {
  const m: Record<string, string> = {
    CREDIT_CARD: 'Kredi Kartı', credit_card: 'Kredi Kartı',
    DEBIT_CARD: 'Banka Kartı', debit_card: 'Banka Kartı',
    bank_transfer: 'EFT/Havale',
  };
  if (!method) return status === 'paid' ? 'Ödendi' : 'Beklemede';
  return m[method] || method;
}

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const itemAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, status, payment_status, payment_method, created_at, shipped_at, delivered_at')
          .eq('user_id', user.id)
          .neq('payment_status', 'failed')
          .order('created_at', { ascending: false });
        if (mounted) setOrders((ordersData || []) as OrderData[]);
      } catch { /* */ }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [router]);

  const activeOrders = orders.filter(o =>
    ['preparing', 'printing', 'quality_check', 'packaging', 'shipped'].includes(o.status)
  ).length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;

  const stats = [
    { icon: ShoppingCart, label: 'Toplam Sipariş', value: String(orders.length), suffix: 'adet' },
    { icon: Package, label: 'Aktif Sipariş', value: String(activeOrders), suffix: 'adet' },
    { icon: CheckCircle2, label: 'Tamamlanan', value: String(completedOrders), suffix: 'adet' },
  ];

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-8">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid gap-4 grid-cols-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-8">

        {/* Hero */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                  <ShoppingCart className="h-3 w-3 text-primary" />
                  Siparişlerim
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Siparişlerim</h1>
              <p className="mt-1 text-sm text-muted-foreground">Siparişlerinizi görüntüleyin ve takip edin</p>
            </div>
            {orders.length > 0 && (
              <Button asChild size="lg" className="h-12 gap-2 rounded-xl px-6 shadow-lg shadow-primary/25">
                <Link href="/upload"><Store className="h-5 w-5" />Yeni Sipariş Ver</Link>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemAnim} className="grid gap-4 grid-cols-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5">
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-primary/5" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Icon className="h-3.5 w-3.5 text-primary" /> {s.label}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">{s.value}</span>
                    <span className="text-xs text-muted-foreground">{s.suffix}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Orders */}
        {orders.length === 0 ? (
          <motion.div variants={itemAnim}>
            <Card className="relative overflow-hidden border-2 border-dashed border-border/60 bg-card/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_70%)]" />
              <CardContent className="relative flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                    <ShoppingCart className="h-9 w-9 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Henüz Sipariş Vermediniz</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
                  İlk modelinizi yükleyin, malzeme seçin ve siparişinizi verin
                </p>
                <Button asChild size="lg" className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                  <Link href="/upload"><ShoppingCart className="h-5 w-5" />İlk Siparişinizi Verin</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemAnim} className="space-y-4">
            {orders.map((order, idx) => {
              const meta = getStatusMeta(order.status);
              const StatusIcon = meta.icon;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Left: Order info */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                              Sipariş #{order.order_number}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatTimeAgo(order.created_at)}
                            </p>
                          </div>
                          <Badge variant="secondary" className={`gap-1.5 border text-xs px-3 py-1 font-medium shrink-0 ${meta.color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {meta.label}
                          </Badge>
                        </div>

                        {/* Detail grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-0.5">Toplam Tutar</p>
                            <p className="text-sm font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-0.5">Durum</p>
                            <p className="text-sm font-medium">{statusLabel(order.status)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-0.5">Ödeme</p>
                            <p className="text-sm font-medium">{paymentLabel(order.payment_method, order.payment_status)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-0.5">Teslimat</p>
                            <p className="text-sm font-medium">{getEstimatedDelivery(order.status, order.shipped_at)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action */}
                      <div className="sm:self-center shrink-0">
                        <Button variant="outline" className="w-full sm:w-auto h-10 gap-2 rounded-xl text-xs" asChild>
                          <Link href={`/dashboard/orders/${order.id}`}>
                            Detay
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <div className="h-4" />
      </motion.div>
    </DashboardShell>
  );
}
