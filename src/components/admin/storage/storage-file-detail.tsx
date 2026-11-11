'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { X, FileText, Box, User, Calendar, HardDrive, AlertTriangle, CheckCircle2, Eye, Image, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { formatBytes } from './shared';
import { storageService } from '@/lib/services/storage-service';

const ModelViewer = dynamic(
  () => import('@/components/upload/ModelViewer').then((mod) => mod.ModelViewer),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )}
);

interface FileWithUser {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  bucket_name: string | null;
  volume_cm3: number | null;
  surface_area_cm2: number | null;
  bounding_box_x: number | null;
  bounding_box_y: number | null;
  bounding_box_z: number | null;
  triangle_count: number | null;
  is_manifold: boolean | null;
  has_errors: boolean;
  analysis_status: string;
  thumbnail_path: string | null;
  color: string | null;
  metadata: any;
  created_at: string;
  users: { id: string; full_name: string | null; email: string | null } | null;
}

interface StorageFileDetailProps {
  file: FileWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StorageFileDetail({ file, open, onOpenChange }: StorageFileDetailProps) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!file) return;
    try {
      const isStlFile = file.mime_type === 'model/stl' || file.filename?.endsWith('.stl');
      const bucket = isStlFile ? 'stl-files' : 'images';
      const blob = await storageService.downloadFile(bucket, file.storage_path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Dosya indirilemedi');
    }
  };

  useEffect(() => {
    if (!open || !file?.storage_path) return;
    if (!file.mime_type?.startsWith('model/') && !file.filename?.endsWith('.stl')) return;

    const loadModelUrl = async () => {
      const supabase = createClient();
      const { data: urlData } = await supabase
        .storage
        .from('stl-files')
        .createSignedUrl(file.storage_path, 3600);
      if (urlData?.signedUrl) {
        setModelUrl(urlData.signedUrl);
      }
    };
    loadModelUrl();
  }, [open, file?.storage_path, file?.mime_type, file?.filename]);

  if (!file) return null;

  const isStl = file.mime_type === 'model/stl' || file.filename?.endsWith('.stl');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              {isStl ? <Box className="h-5 w-5 text-primary" /> : <Image className="h-5 w-5 text-primary" />}
              Dosya Detayı
            </Dialog.Title>
            <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-6">
            {/* 3D Model Preview for STL files - auto-show */}
            {isStl && modelUrl && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    3D Model Önizleme
                  </h4>
                </div>
                <div className="rounded-lg overflow-hidden border border-border/50 mb-4 bg-black/5" style={{ height: '400px' }}>
                  <ModelViewer
                    url={modelUrl}
                    className="border-0 w-full h-full"
                    showControls={true}
                    autoRotate={true}
                  />
                </div>
              </div>
            )}

            {/* Image Preview */}
            {!isStl && file.mime_type?.startsWith('image/') && (
              <ImagePreview file={file} />
            )}

            {/* File Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Dosya Adı</label>
                <div className="text-sm font-medium mt-0.5 break-all">{file.original_filename}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Sistem Adı</label>
                <div className="text-sm font-medium mt-0.5 truncate">{file.filename}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Boyut</label>
                <div className="text-sm font-medium mt-0.5">{formatBytes(file.file_size)}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Tür</label>
                <div className="text-sm font-medium mt-0.5">{file.mime_type}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Kullanıcı</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {file.users?.full_name || file.users?.email || 'Bilinmiyor'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Kullanıcı Email</label>
                <div className="text-sm font-medium mt-0.5">{file.users?.email || '-'}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Yükleme Tarihi</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {new Date(file.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Analiz Durumu</label>
                <div className="text-sm font-medium mt-0.5">
                  <Badge variant="outline" className={
                    file.analysis_status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                    file.analysis_status === 'processing' ? 'bg-amber-500/10 text-amber-600' :
                    file.analysis_status === 'failed' ? 'bg-red-500/10 text-red-600' :
                    'bg-gray-500/10 text-gray-600'
                  }>
                    {file.analysis_status === 'completed' ? 'Tamamlandı' :
                     file.analysis_status === 'processing' ? 'İşleniyor' :
                     file.analysis_status === 'failed' ? 'Başarısız' : 'Beklemede'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* STL Analysis Results */}
            {isStl && file.analysis_status === 'completed' && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Box className="h-4 w-4 text-primary" />
                  STL Analiz Sonuçları
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                      <span className="text-sm text-muted-foreground">Hacim</span>
                      <span className="text-sm font-semibold">{file.volume_cm3?.toFixed(2)} cm³</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                      <span className="text-sm text-muted-foreground">Yüzey Alanı</span>
                      <span className="text-sm font-semibold">{file.surface_area_cm2?.toFixed(2)} cm²</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                      <span className="text-sm text-muted-foreground">Üçgen Sayısı</span>
                      <span className="text-sm font-semibold">{file.triangle_count?.toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                      <span className="text-sm text-muted-foreground">Bounding Box (X)</span>
                      <span className="text-sm font-semibold">{file.bounding_box_x?.toFixed(2)} mm</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                      <span className="text-sm text-muted-foreground">Bounding Box (Y)</span>
                      <span className="text-sm font-semibold">{file.bounding_box_y?.toFixed(2)} mm</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                      <span className="text-sm text-muted-foreground">Bounding Box (Z)</span>
                      <span className="text-sm font-semibold">{file.bounding_box_z?.toFixed(2)} mm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isStl && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Durum Bilgileri</h4>
                  <div className="flex flex-wrap gap-3">
                    {file.is_manifold !== null && (
                      <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        file.is_manifold ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        {file.is_manifold ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {file.is_manifold ? 'Manifold' : 'Non-Manifold'}
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      !file.has_errors ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {!file.has_errors ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {!file.has_errors ? 'Hata Yok' : 'Hatalı'}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Storage Path */}
            <Separator />
            <div>
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                Depolama Yolu
              </label>
              <div className="text-xs font-mono mt-1 p-2 rounded-md bg-muted/30 break-all">
                {isStl ? 'stl-files' : 'images'}/{file.storage_path}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function getImageUrl(file: FileWithUser): string {
  if (!file.storage_path) return '';
  try {
    const bucket = file.bucket_name || 'images';
    return storageService.getFileUrl(bucket, file.storage_path);
  } catch {
    return '';
  }
}

function ImagePreview({ file }: { file: FileWithUser }) {
  const publicUrl = getImageUrl(file);

  return (
    <div className="rounded-lg overflow-hidden border border-border/50 bg-muted/20 flex items-center justify-center p-4">
      {publicUrl ? (
        <img
          src={publicUrl}
          alt={file.original_filename}
          className="max-w-full max-h-64 object-contain rounded"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div className={publicUrl ? 'hidden' : 'text-center text-muted-foreground'}>
        <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{file.original_filename}</p>
        <p className="text-xs mt-1">{formatBytes(file.file_size)}</p>
      </div>
    </div>
  );
}
