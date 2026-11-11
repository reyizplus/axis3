import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Calculator,
  Clock,
  HardDrive,
  Package,
  RefreshCw,
  Shield,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
import { StatsCard } from './_components/stats-card';
import { QuickActionGrid } from './_components/quick-action-grid';
import { RecentCalculations } from './_components/recent-calculations';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = await adminServiceServer.isAdmin();

  if (!isAdmin) {
    redirect('/dashboard');
  }

  const analytics = await adminServiceServer.getPricingAnalytics();
  const materials = await adminServiceServer.getMaterials(true);
  const settings = await adminServiceServer.getGlobalSettings();
  const systemHealth = await adminServiceServer.getSystemHealth();
  const orderStatusCounts = await adminServiceServer.getOrderStatusCounts();
  const recentSignups = await adminServiceServer.getRecentSignups(7);

  const orderStatusLabels: Record<string, string> = {
    pending: 'Beklemede', payment_received: 'Ödeme Alındı', preparing: 'Hazırlanıyor',
    printing: 'Baskıda', quality_check: 'Kalite Kontrol', packaging: 'Paketleniyor',
    shipped: 'Kargoda', delivered: 'Teslim Edildi', cancelled: 'İptal', refunded: 'İade',
  };

  const totalOrders = Object.values(orderStatusCounts).reduce((sum, c) => sum + c, 0);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  const stats = [
    {
      title: 'Toplam Hesaplama',
      value: analytics.totalCalculations.toLocaleString('tr-TR'),
      icon: 'Calculator',
      trend: '+%12 bu ay',
      trendUp: true,
      gradient: 'from-blue-500/20 to-blue-500/5',
      iconColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Ortalama Fiyat',
      value: `₺${analytics.averagePrice.toFixed(2)}`,
      icon: 'DollarSign',
      trend: '%8 değişim',
      trendUp: false,
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      iconColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Aktif Malzeme',
      value: materials.filter(m => m.is_active).length.toString(),
      icon: 'Package',
      trend: `${materials.filter(m => m.stock_status === 'low_stock').length} az stok`,
      trendUp: false,
      gradient: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Depolama',
      value: formatBytes(systemHealth.totalStorageBytes),
      icon: 'HardDrive',
      trend: `${systemHealth.totalFileCount} dosya`,
      trendUp: true,
      gradient: 'from-orange-500/20 to-orange-500/5',
      iconColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    },
  ];

  const quickActions = [
    {
      title: 'Siparişler',
      href: '/admin/orders',
      icon: 'ShoppingCart',
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
    {
      title: 'Ürünler',
      href: '/admin/store/products',
      icon: 'Store',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Kategoriler',
      href: '/admin/store/categories',
      icon: 'Tag',
      color: 'text-teal-500',
      bg: 'bg-teal-500/10',
    },
    {
      title: 'Malzemeler',
      href: '/admin/materials',
      icon: 'Package',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Kullanıcılar',
      href: '/admin/users',
      icon: 'Users',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      title: 'Blog',
      href: '/admin/blog',
      icon: 'FileText',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Geri Bildirim',
      href: '/admin/feedback',
      icon: 'MessageSquare',
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
    },
    {
      title: 'Kargo',
      href: '/admin/cargo',
      icon: 'Truck',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'Envanter',
      href: '/admin/inventory',
      icon: 'Boxes',
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
    },
    {
      title: 'Depo',
      href: '/admin/storage',
      icon: 'HardDrive',
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
    },
    {
      title: 'Fiyatlandırma',
      href: '/admin/settings',
      icon: 'BarChart3',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Yönetim',
      href: '/admin/security',
      icon: 'Shield',
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
    },
  ];

  return (
    <div className="animate-in">
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              AXIS3 yönetim paneline hoş geldiniz.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yenile</span>
            </Button>
            <Button asChild size="sm" className="h-9 gap-2 shadow-sm">
              <Link href="/admin/orders">
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Hızlı İşlem</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, i) => (
            <StatsCard key={i} {...stat} />
          ))}
        </div>

        {/* Quick Actions + Order Status */}
        <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold tracking-tight">Hızlı Erişim</h2>
              <Link href="/admin/settings" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Tümü
              </Link>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              <QuickActionGrid actions={quickActions} />
            </div>
          </div>

          <div className="lg:col-span-1 xl:col-span-2 space-y-6">
            {/* Order Status */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
                    Sipariş Durumları
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs font-normal shrink-0">
                    {totalOrders} toplam
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(orderStatusCounts)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => (
                      <Link
                        key={status}
                        href={`/admin/orders?status=${status}`}
                        className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold tabular-nums">{count}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {orderStatusLabels[status] || status}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </Link>
                    ))}
                  {Object.keys(orderStatusCounts).length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-6">
                      Henüz sipariş yok
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Signups */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary shrink-0" />
                    Son Kayıt Olanlar
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs font-normal shrink-0">
                    {recentSignups.count} yeni
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {recentSignups.users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Son 7 günde kayıt yok
                  </p>
                ) : (
                  <div className="space-y-1">
                    {recentSignups.users.slice(0, 5).map((u: Record<string, unknown>) => (
                      <div
                        key={u.id as string}
                        className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors text-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/5 text-xs font-semibold text-primary shrink-0">
                            {((u.full_name as string) || (u.email as string) || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium truncate">
                            {(u.full_name as string) || (u.email as string) || 'İsimsiz'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {new Date(u.created_at as string).toLocaleDateString('tr-TR', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 text-center">
                      <Button variant="link" size="sm" asChild className="h-8">
                        <Link href="/admin/users">
                          Tüm Kullanıcılar
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid gap-6 lg:grid-cols-2 min-w-0">
          <RecentCalculations
            calculations={analytics.recentCalculations}
            totalCount={analytics.totalCalculations}
          />

          {/* System Health + Popular Materials */}
          <div className="space-y-6 min-w-0">
            {/* System Status */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Sistem Durumu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Database</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">Depolama</span>
                    </div>
                    <p className="text-sm font-semibold break-all">{formatBytes(systemHealth.totalStorageBytes)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{systemHealth.totalFileCount} dosya</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">Toplam</span>
                    </div>
                    <p className="text-sm font-semibold">{systemHealth.totalCalculations.toLocaleString('tr-TR')}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Hesaplama</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">Son</span>
                    </div>
                    <p className="text-xs font-semibold leading-tight break-all">
                      {systemHealth.lastCalculationDate
                        ? new Date(systemHealth.lastCalculationDate).toLocaleDateString('tr-TR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })
                        : 'Yok'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Popular Materials */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Popüler Malzemeler
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {analytics.popularMaterials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Henüz veri yok</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.popularMaterials.map((material, index) => {
                      const maxCount = analytics.popularMaterials[0]?.count || 1;
                      const barWidth = (material.count / maxCount) * 100;
                      return (
                        <div key={material.material} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold shrink-0',
                                index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                index === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                              )}>
                                #{index + 1}
                              </div>
                              <span className="font-medium truncate">{material.material}</span>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 ml-1">
                              {material.count}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
