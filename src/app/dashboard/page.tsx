'use client';

import { useLayoutEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const ModelViewer = dynamic(
  () => import('@/components/upload/ModelViewer').then((mod) => mod.ModelViewer),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Upload,
  Box,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Eye,
  MessageSquare,
  Sparkles,
  FileUp,
  Layers,
  Printer,
  Store,
  Package,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { storageService } from '@/lib/services/storage-service';
import { cartService } from '@/lib/cart/cart-service';

interface FileData {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  volume_cm3: number | null;
  analysis_status: string;
  created_at: string;
  storage_path: string;
}

const statIcons = [Box, ShoppingCart, CheckCircle2, MessageSquare];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [recentFiles, setRecentFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [stats, setStats] = useState([
    { title: 'Toplam Model', value: '0', href: '/dashboard/files', desc: 'Yüklenen dosya' },
    { title: 'Sepetim', value: '0', href: '/cart', desc: 'Ürün' },
    { title: 'Siparişlerim', value: '0', href: '/dashboard/orders', desc: 'Sipariş' },
    { title: 'Geri Bildirim', value: '0', href: '/dashboard/feedback', desc: 'Görüşleriniz' },
  ]);

  const loadDashboardData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setAuthenticated(true);

      const [filesData, { count: totalFilesCount }, { count: fetchedOrdersCount }, { count: fetchedFeedbackCount }] = await Promise.all([
        (supabase as any).from('files')
          .select('id, filename, original_filename, file_size, volume_cm3, analysis_status, created_at, storage_path')
          .eq('user_id', user.id).is('deleted_at', null).neq('analysis_status', 'failed')
          .order('created_at', { ascending: false }).limit(3),
        (supabase as any).from('files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).is('deleted_at', null).neq('analysis_status', 'failed'),
        (supabase as any).from('orders')
          .select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        (supabase as any).from('feedback')
          .select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setRecentFiles((filesData.data || []) as FileData[]);
      const cartItemsCount = cartService.getTotalItems();
      setStats([
        { title: 'Toplam Model', value: (totalFilesCount || 0).toString(), href: '/dashboard/files', desc: 'Yüklenen dosya' },
        { title: 'Sepetim', value: cartItemsCount.toString(), href: '/cart', desc: 'Ürün' },
        { title: 'Siparişlerim', value: (fetchedOrdersCount || 0).toString(), href: '/dashboard/orders', desc: 'Sipariş' },
        { title: 'Geri Bildirim', value: (fetchedFeedbackCount || 0).toString(), href: '/dashboard/feedback', desc: 'Görüşleriniz' },
      ]);
      setOrdersCount(fetchedOrdersCount || 0);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useLayoutEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const handleViewFile = async (file: FileData) => {
    setSelectedFile(file);
    try {
      const filePath = file.storage_path || file.filename;
      const url = await storageService.getSignedFileUrl('stl-files', filePath, 3600);
      setFileUrl(url);
      setViewerOpen(true);
    } catch {
      alert('Dosya önizlemesi yüklenemedi.');
    }
  };

  const onboardingSteps = [
    { label: 'Hesap oluşturuldu', done: true },
    { label: 'İlk model yüklendi', done: recentFiles.length > 0 },
    { label: 'İlk sipariş verildi', done: ordersCount > 0 },
  ];
  const progressPct = Math.round((onboardingSteps.filter(s => s.done).length / onboardingSteps.length) * 100);

  const container = { animate: { transition: { staggerChildren: 0.08 } } } as const;
  const item = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
  } as const;

  if (loading || !authenticated) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  const quickActions = [
    { icon: FileUp, label: 'Model Yükle', href: '/upload', desc: 'STL dosyanızı yükleyin', color: 'from-orange-500/20 to-amber-500/10' },
    { icon: Store, label: 'Mağaza', href: '/dashboard/store', desc: 'Hazır modelleri keşfedin', color: 'from-blue-500/20 to-cyan-500/10' },
    { icon: Package, label: 'Siparişlerim', href: '/dashboard/orders', desc: 'Sipariş durumunu takip edin', color: 'from-green-500/20 to-emerald-500/10' },
    { icon: Layers, label: 'Modellerim', href: '/dashboard/files', desc: 'Tüm modellerinizi görün', color: 'from-purple-500/20 to-pink-500/10' },
  ];

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-8">
        {/* Hero */}
        <motion.div variants={item} className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Aktif
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                  Hoş Geldiniz
                  <span className="ml-3 inline-block bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">✦</span>
                </h1>
                <p className="mt-2 max-w-xl text-base text-muted-foreground">
                  3D baskı siparişlerinizi yönetin, modellerinizi görüntüleyin ve ilerlemenizi takip edin.
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <Button asChild size="lg" className="h-12 gap-2 rounded-xl px-6 shadow-lg shadow-primary/25">
                  <Link href="/upload"><Upload className="h-5 w-5" />Model Yükle</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 rounded-xl px-6">
                  <Link href="/hizmetler">Hizmetler</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = statIcons[i];
            return (
              <Link key={i} href={stat.href} className="group">
                <Card className="relative overflow-hidden border-2 border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 group-hover:-translate-y-0.5">
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-primary/5 transition-all duration-500 group-hover:scale-150 group-hover:bg-primary/10" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                      <div className="rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
                      <span className="text-xs text-muted-foreground">{stat.desc}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Detay <ArrowUpRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </motion.div>

        {/* Recent + Onboarding */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Files */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="border-2 border-border/60 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Son Modeller</h2>
                  <p className="text-sm text-muted-foreground">Son yüklenen 3 dosya</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
                  <Link href="/dashboard/files">Tümü <ArrowRight className="h-3 w-3" /></Link>
                </Button>
              </div>
              <CardContent className="p-5">
                {recentFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-4 rounded-2xl bg-muted/50 p-4">
                      <Box className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <p className="mb-1 font-medium">Henüz model yüklenmemiş</p>
                    <p className="mb-4 text-sm text-muted-foreground">İlk 3D modelinizi yükleyerek başlayın</p>
                    <Button asChild><Link href="/upload"><Upload className="mr-2 h-4 w-4" />Model Yükle</Link></Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {recentFiles.map((file, idx) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group relative overflow-hidden rounded-xl border-2 border-border/60 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          {idx === 0 ? (
                            <div className="relative flex items-center justify-center">
                              <div className="absolute h-16 w-16 animate-pulse rounded-full bg-primary/10" />
                              <Printer className="h-10 w-10 text-primary/40" />
                            </div>
                          ) : (
                            <Box className="h-10 w-10 text-primary/40" />
                          )}
                          <Badge variant="outline" className="absolute right-2 top-2 border-primary/20 bg-background/80 backdrop-blur-sm text-[10px] px-1.5 py-0">
                            {file.volume_cm3 ? `${file.volume_cm3.toFixed(0)}cm³` : 'Analiz'}
                          </Badge>
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-medium">{file.original_filename}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">{new Date(file.created_at).toLocaleDateString('tr-TR')}</span>
                            <button
                              onClick={() => handleViewFile(file)}
                              className="flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <Eye className="h-3 w-3" /> Önizle
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Onboarding */}
          <motion.div variants={item}>
            <Card className="h-full border-2 border-border/60 bg-card/50 backdrop-blur-sm">
              <div className="border-b border-border/50 px-6 py-4">
                <h2 className="text-lg font-semibold">Başlangıç</h2>
                <p className="text-sm text-muted-foreground">Hesap ilerlemesi</p>
              </div>
              <CardContent className="p-5 space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Tamamlanma</span>
                    <span className="text-muted-foreground">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-orange-400" />
                </div>

                <div className="space-y-3">
                  {onboardingSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        step.done ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                      )}>
                        {step.done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs text-muted-foreground">{i + 1}</span>}
                      </div>
                      <span className={cn('text-sm', step.done ? 'font-medium' : 'text-muted-foreground')}>{step.label}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">İpucu</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {recentFiles.length === 0
                      ? 'İlk modelinizi yükleyerek 3D baskı dünyasına adım atın!'
                      : ordersCount === 0
                        ? 'Modellerinizi sepete ekleyip sipariş verin!'
                        : 'Harika! Tüm adımları tamamladınız.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={item}>
          <h2 className="mb-4 text-lg font-semibold">Hızlı İşlemler</h2>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Link key={i} href={action.href} className="group">
                  <Card className="relative overflow-hidden border-2 border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg group-hover:-translate-y-0.5">
                    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100', action.color)} />
                    <CardContent className="relative p-5">
                      <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold">{action.label}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{action.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Getting Started */}
        <motion.div variants={item}>
          <Card className="border-2 border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute right-0 top-0 h-64 w-64 translate-x-16 -translate-y-16 rounded-full bg-primary/[0.03]" />
            <div className="relative px-6 py-5 sm:px-8 sm:py-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Nasıl Başlarım?</h2>
                <p className="text-sm text-muted-foreground">3 basit adımda siparişinizi tamamlayın</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { step: '01', title: 'STL Yükle', desc: '3D modelinizi sürükle-bırak ile yükleyin', icon: Upload },
                  { step: '02', title: 'Malzeme Seç', desc: 'FDM veya SLA teknolojisi ve malzeme seçin', icon: Printer },
                  { step: '03', title: 'Sipariş Ver', desc: 'Anında fiyat alın ve siparişinizi tamamlayın', icon: Package },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="relative flex gap-4 sm:flex-col sm:gap-3"
                    >
                      {i < 2 && <div className="absolute left-[19px] top-10 hidden h-8 w-px bg-gradient-to-b from-primary/40 to-transparent sm:block" />}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-primary">
                        {item.step}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-sm">{item.title}</h3>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </motion.div>

      {/* 3D Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedFile?.original_filename}</DialogTitle>
            <DialogDescription>3D model önizlemesi — döndürmek için sürükleyin, yakınlaştırmak için kaydırın</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {fileUrl && <ModelViewer url={fileUrl} className="h-full" showControls />}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
