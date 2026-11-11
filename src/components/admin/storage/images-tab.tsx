'use client';

import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Image, User, ExternalLink, Trash2, X, Download } from 'lucide-react';
import { StorageDeleteDialog } from './storage-delete-dialog';
import { formatBytes } from './shared';
import { storageService } from '@/lib/services/storage-service';

interface FileWithUser {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  bucket_name: string | null;
  created_at: string;
  users: { id: string; full_name: string | null; email: string | null } | null;
}

interface ImagesTabProps {
  files: FileWithUser[];
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

export function ImagesTab({ files }: ImagesTabProps) {
  const [deleteFile, setDeleteFile] = useState<FileWithUser | null>(null);
  const [previewFile, setPreviewFile] = useState<FileWithUser | null>(null);

  const handleDownload = async (file: FileWithUser) => {
    try {
      const blob = await storageService.downloadFile('images', file.storage_path);
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

  const previewImageUrl = useMemo(() => {
    return previewFile ? getImageUrl(previewFile) : null;
  }, [previewFile]);

  if (files.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Resim dosyası bulunamadı</p>
            <p className="text-sm mt-1">Henüz hiçbir resim dosyası yüklenmemiş.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {files.map((file) => {
          const imgUrl = getImageUrl(file);
          return (
            <Card key={file.id} className="border-border/60 overflow-hidden group">
              <div
                className="aspect-video bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => setPreviewFile(file)}
              >
                {imgUrl ? (
                  <>
                    <img
                      src={imgUrl}
                      alt={file.original_filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden flex-col items-center gap-2 text-muted-foreground">
                      <Image className="h-8 w-8 opacity-30" />
                      <span className="text-xs">{file.original_filename}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Image className="h-8 w-8 opacity-30" />
                    <span className="text-xs">{file.original_filename}</span>
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {file.users?.full_name || file.users?.email || 'Bilinmiyor'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatBytes(file.file_size)}</span>
                  <span>
                    {new Date(file.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'short',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 flex-1"
                    onClick={() => setPreviewFile(file)}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Önizle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDownload(file)}
                    title="İndir"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => setDeleteFile(file)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog.Root open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] border bg-background p-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                {previewFile?.original_filename}
              </Dialog.Title>
              <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden">
              {previewImageUrl ? (
                <>
                  <img
                    src={previewImageUrl}
                    alt={previewFile?.original_filename || ''}
                    className="max-w-full max-h-[70vh] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden flex-col items-center gap-2 text-muted-foreground p-8">
                    <Image className="h-12 w-12 opacity-30" />
                    <p className="text-sm">{previewFile?.original_filename}</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                  <Image className="h-12 w-12 opacity-30" />
                  <p className="text-sm">{previewFile?.original_filename}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>{formatBytes(previewFile?.file_size || 0)}</span>
              <span>
                {previewFile?.created_at ? new Date(previewFile.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                }) : ''}
              </span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <StorageDeleteDialog
        file={deleteFile}
        open={!!deleteFile}
        onOpenChange={(open) => { if (!open) setDeleteFile(null); }}
        onDeleted={() => setDeleteFile(null)}
      />
    </>
  );
}
