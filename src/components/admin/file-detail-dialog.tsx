'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { X, FileText, Box, AlertTriangle, CheckCircle2, Eye, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const ModelViewer = dynamic(() => import('@/components/upload/ModelViewer').then(m => m.ModelViewer), { ssr: false });
import { createClient } from '@/lib/supabase/client';
import { storageService } from '@/lib/services/storage-service';

interface FileDetail {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  volume_cm3: number | null;
  surface_area_cm2: number | null;
  bounding_box_x: number | null;
  bounding_box_y: number | null;
  bounding_box_z: number | null;
  triangle_count: number | null;
  is_manifold: boolean | null;
  has_errors: boolean;
  error_details: unknown;
  storage_path: string;
  analysis_status: string;
  created_at: string;
}

interface FileDetailDialogProps {
  file: FileDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function FileDetailDialog({ file, open, onOpenChange }: FileDetailDialogProps) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);

  const handleDownload = async () => {
    if (!file) return;
    try {
      const bucket = file.mime_type?.startsWith('image/') ? 'images' : 'stl-files';
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
  }, [open, file?.storage_path]);

  if (!file) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-lg max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Model Detayı
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" />
                İndir
              </Button>
              <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>

          <div className="space-y-6">
            {/* 3D Model Preview */}
            {modelUrl && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    3D Model Önizleme
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowModel(!showModel)}
                  >
                    {showModel ? 'Gizle' : 'Göster'}
                  </Button>
                </div>
                {showModel && (
                  <div className="rounded-lg overflow-hidden border border-border/50 mb-4">
                    <ModelViewer
                      url={modelUrl}
                      className="border-0"
                      showControls={true}
                      autoRotate={true}
                    />
                  </div>
                )}
              </div>
            )}

            {/* File Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Dosya Adı</label>
                <div className="text-sm font-medium mt-0.5">{file.original_filename}</div>
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
                <label className="text-xs text-muted-foreground font-medium">Yükleme Tarihi</label>
                <div className="text-sm font-medium mt-0.5">
                  {new Date(file.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
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

            {/* STL Analysis */}
            {file.analysis_status === 'completed' && (
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

            <Separator />

            {/* Status Flags */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Durum Bilgileri</h4>
              <div className="flex flex-wrap gap-3">
                {file.is_manifold !== null && (
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    file.is_manifold ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                  }`}>
                    {file.is_manifold ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {file.is_manifold ? 'Manifold' : 'Non-Manifold'}
                  </div>
                )}
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  !file.has_errors ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                }`}>
                  {!file.has_errors ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {!file.has_errors ? 'Hata Yok' : 'Hatalı'}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
