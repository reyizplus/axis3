'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileText, Eye, Download, Box } from 'lucide-react';
import { FileDetailDialog } from './file-detail-dialog';
import { storageService } from '@/lib/services/storage-service';

interface UploadedFile {
  id: string; filename: string; original_filename: string; file_size: number;
  mime_type: string; volume_cm3: number | null; surface_area_cm2: number | null;
  bounding_box_x: number | null; bounding_box_y: number | null; bounding_box_z: number | null;
  triangle_count: number | null; is_manifold: boolean | null; has_errors: boolean;
  error_details: unknown; storage_path: string; analysis_status: string; created_at: string;
}

interface UserFilesSectionProps { files: UploadedFile[]; }

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const analysisStatusColors: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600', processing: 'bg-amber-500/10 text-amber-600',
  pending: 'bg-gray-500/10 text-gray-600', failed: 'bg-red-500/10 text-red-600',
};

const analysisStatusLabels: Record<string, string> = {
  completed: 'Tamamlandı', processing: 'İşleniyor', pending: 'Beklemede', failed: 'Başarısız',
};

export function UserFilesSection({ files }: UserFilesSectionProps) {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  const sorted = [...files].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleDownload = async (file: UploadedFile) => {
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
    } catch { toast.error('Dosya indirilemedi'); }
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Box className="h-4 w-4 text-primary shrink-0" />
                Yüklenen Modeller
              </CardTitle>
              <CardDescription className="text-xs">{sorted.length} model</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz model yüklememiş</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs sm:text-sm font-semibold truncate max-w-[150px] sm:max-w-[250px]">{file.original_filename}</span>
                      <Badge variant="outline" className={`text-[10px] h-4 px-1 ${analysisStatusColors[file.analysis_status] || ''}`}>
                        {analysisStatusLabels[file.analysis_status] || file.analysis_status}
                      </Badge>
                      {file.has_errors && <span className="text-[10px] text-red-500">(Hatalı)</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      <span>{formatBytes(file.file_size)}</span>
                      {file.volume_cm3 != null && <span>{file.volume_cm3.toFixed(2)} cm³</span>}
                      <span>{new Date(file.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownload(file)} title="İndir">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedFile(file)} title="Detay">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <FileDetailDialog
        file={selectedFile}
        open={!!selectedFile}
        onOpenChange={(open) => { if (!open) setSelectedFile(null); }}
      />
    </>
  );
}
