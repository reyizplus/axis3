'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const ModelViewer = dynamic(() => import('@/components/upload/ModelViewer').then(m => m.ModelViewer), { ssr: false });
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Upload, Box, Download, Trash2, Eye, DollarSign, Clock, CheckCircle2, AlertCircle, Loader2, FileUp, HardDrive, Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { storageService } from '@/lib/services/storage-service';
import { cn } from '@/lib/utils';

interface FileData {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  volume_cm3: number | null;
  analysis_status: string;
  created_at: string;
  thumbnail_path: string | null;
  storage_path: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    completed: { label: 'Analiz Tamamlandı', color: 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle2 },
    processing: { label: 'İşleniyor', color: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Clock },
    failed: { label: 'Hata', color: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400', icon: AlertCircle },
    pending: { label: 'Beklemede', color: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', icon: Clock },
  };
  const s = map[status];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <Badge variant="secondary" className={cn('gap-1 border text-[10px] px-2 py-0.5 font-medium', s.color)}>
      <Icon className="h-3 w-3" /> {s.label}
    </Badge>
  );
}

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/login'); return; }
      const { data: filesData, error: fetchError } = await (supabase
        .from('files')
        .select('id, filename, original_filename, file_size, volume_cm3, analysis_status, created_at, thumbnail_path, storage_path') as any)
        .eq('user_id', session.user.id).is('deleted_at', null)
        .neq('analysis_status', 'failed').order('created_at', { ascending: false });
      if (fetchError) toast.error('Dosyalar yüklenirken hata oluştu');
      setFiles((filesData || []) as FileData[]);
    } catch { toast.error('Dosyalar yüklenirken hata oluştu'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleView = async (file: FileData) => {
    setSelectedFile(file);
    try {
      const filePath = file.storage_path || file.filename;
      const url = await storageService.getSignedFileUrl('stl-files', filePath, 3600);
      setFileUrl(url); setViewerOpen(true);
    } catch { toast.error('Dosya önizlemesi yüklenemedi.'); }
  };

  const handleDownload = async (file: FileData) => {
    try {
      const filePath = file.storage_path || file.filename;
      const blob = await storageService.downloadFile('stl-files', filePath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = file.original_filename;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { toast.error('Dosya indirilemedi.'); }
  };

  const handleDelete = async (file: FileData) => {
    setDeletingId(file.id);
    try {
      const supabase = createClient();
      const { data: checkResult, error: checkError } = await (supabase as any).rpc('check_file_in_orders', { file_uuid: file.id });
      if (checkError) throw new Error('Dosya kontrolü yapılamadı');
      const isInOrder = checkResult as unknown as boolean;
      const confirmMessage = isInOrder
        ? `"${file.original_filename}" bir siparişte kullanılmıştır.\n\nListeden gizlenecek, sipariş kayıtları için sistemde saklanacaktır.\n\nDevam?`
        : `"${file.original_filename}" kalıcı olarak silinsin mi?`;
      if (!confirm(confirmMessage)) { setDeletingId(null); return; }
      const { error: dbError } = await (supabase as any).from('files').update({ deleted_at: new Date().toISOString() }).eq('id', file.id);
      if (dbError) throw dbError;
      if (!isInOrder) { try { await storageService.deleteFile('stl-files', file.storage_path || file.filename); } catch { /* */ } }
      await loadFiles();
      toast.success(isInOrder ? 'Dosya listenizden gizlendi.' : 'Dosya silindi.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Dosya silinemedi.'); }
    finally { setDeletingId(null); }
  };

  const totalVolume = files.reduce((acc, f) => acc + (f.volume_cm3 || 0), 0);
  const thisMonthFiles = files.filter(f => { const d = new Date(f.created_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length;

  const stats = [
    { icon: Box, label: 'Toplam Model', value: String(files.length), suffix: 'dosya' },
    { icon: HardDrive, label: 'Toplam Hacim', value: `${totalVolume.toFixed(1)}`, suffix: 'cm³' },
    { icon: Calendar, label: 'Bu Ay', value: String(thisMonthFiles), suffix: 'yükleme' },
  ];

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-8">
          <div className="grid gap-4 grid-cols-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
                <Skeleton className="aspect-video rounded-none" />
                <div className="p-4 space-y-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-1/2" /><div className="grid grid-cols-2 gap-2 pt-1"><Skeleton className="h-9 rounded-xl" /><Skeleton className="h-9 rounded-xl" /><Skeleton className="h-9 rounded-xl" /><Skeleton className="h-9 rounded-xl" /></div></div>
              </div>
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
        <motion.div variants={item} className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                  <FileUp className="h-3 w-3 text-primary" />
                  Modellerim
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Modellerim</h1>
              <p className="mt-1 text-sm text-muted-foreground">Yüklediğiniz STL dosyalarını görüntüleyin ve yönetin</p>
            </div>
            <Button asChild size="lg" className="h-12 gap-2 rounded-xl px-6 shadow-lg shadow-primary/25">
              <Link href="/upload"><Upload className="h-5 w-5" />Yeni Model Yükle</Link>
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid gap-4 grid-cols-3">
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

        {/* Files */}
        {files.length === 0 ? (
          <motion.div variants={item}>
            <Card className="relative overflow-hidden border-2 border-dashed border-border/60 bg-card/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_70%)]" />
              <CardContent className="relative flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                    <Box className="h-9 w-9 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Henüz Model Yüklemediniz</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">İlk STL dosyanızı yükleyin, otomatik analiz ile saniyeler içinde sonuç alın.</p>
                <Button asChild size="lg" className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                  <Link href="/upload"><Upload className="h-5 w-5" />İlk Modelinizi Yükleyin</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={item}>
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {files.map((file, idx) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-primary/10 via-primary/5 to-muted/50 flex items-center justify-center relative overflow-hidden">
                    <Box className="h-12 w-12 text-primary/30 transition-all duration-500 group-hover:scale-110 group-hover:text-primary/40" />
                    <div className="absolute top-2.5 right-2.5"><StatusBadge status={file.analysis_status} /></div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Title + time */}
                    <div>
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{file.original_filename}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatTimeAgo(file.created_at)}
                      </p>
                    </div>

                    {/* File info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {formatFileSize(file.file_size)}</span>
                      <span className="flex items-center gap-1"><Box className="h-3 w-3" /> {file.volume_cm3 ? `${file.volume_cm3.toFixed(1)} cm³` : '—'}</span>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <Button size="sm" className="h-9 rounded-xl text-xs gap-1.5" onClick={() => router.push(`/upload/${file.id}`)}>
                        <DollarSign className="h-3.5 w-3.5" /> Fiyat Al
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs gap-1.5" onClick={() => handleView(file)}>
                        <Eye className="h-3.5 w-3.5" /> Önizle
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs gap-1.5" onClick={() => handleDownload(file)}>
                        <Download className="h-3.5 w-3.5" /> İndir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-xl text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/50"
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.id}
                      >
                        {deletingId === file.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Sil
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="h-4" />
      </motion.div>

      {/* 3D Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedFile?.original_filename}</DialogTitle>
            <DialogDescription>3D model önizlemesi — döndürmek için sürükleyin, yakınlaştırmak için kaydırın</DialogDescription>
          </DialogHeader>
          <div className="w-full h-[calc(80vh-120px)]">
            {fileUrl && <ModelViewer key={`${selectedFile?.id}-${viewerOpen}`} url={fileUrl} className="h-full" showControls />}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
