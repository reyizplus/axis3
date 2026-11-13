'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Box, User, Eye, Trash2, Download } from 'lucide-react';
import { StorageFileDetail } from './storage-file-detail';
import { StorageDeleteDialog } from './storage-delete-dialog';
import { formatBytes, analysisStatusColors, analysisStatusLabels, type AdminStorageFile } from './shared';
import { storageService } from '@/lib/services/storage-service';

type FileWithUser = AdminStorageFile;

interface StlFilesTabProps {
  files: FileWithUser[];
}

export function StlFilesTab({ files }: StlFilesTabProps) {
  const [selectedFile, setSelectedFile] = useState<FileWithUser | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileWithUser | null>(null);

  const handleDownload = async (file: FileWithUser) => {
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

  if (files.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Box className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">STL dosyası bulunamadı</p>
            <p className="text-sm mt-1">Henüz hiçbir kullanıcı STL dosyası yüklememiş.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Box className="h-4 w-4 text-primary" />
                STL Dosyaları
              </CardTitle>
              <CardDescription>
                Sistemdeki tüm 3D model dosyaları
              </CardDescription>
            </div>
            <Badge variant="secondary">{files.length} dosya</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Dosya Adı</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Kullanıcı</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Boyut</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Analiz</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Yüklenme</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium max-w-[200px] truncate" title={file.original_filename}>
                      {file.original_filename}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {file.users?.full_name || file.users?.email || 'Bilinmiyor'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatBytes(file.file_size)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={analysisStatusColors[file.analysis_status] || ''}>
                        {analysisStatusLabels[file.analysis_status] || file.analysis_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {new Date(file.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownload(file)}
                          title="İndir"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => setDeleteFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <StorageFileDetail
        file={selectedFile}
        open={!!selectedFile}
        onOpenChange={(open) => { if (!open) setSelectedFile(null); }}
      />

      <StorageDeleteDialog
        file={deleteFile}
        open={!!deleteFile}
        onOpenChange={(open) => { if (!open) setDeleteFile(null); }}
        onDeleted={() => setDeleteFile(null)}
      />
    </>
  );
}
