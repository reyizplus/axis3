'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes } from './shared';

interface FileWithUser {
  id: string;
  original_filename: string;
  file_size: number;
  users: { id: string; full_name: string | null } | null;
}

interface StorageDeleteDialogProps {
  file: FileWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function StorageDeleteDialog({ file, open, onOpenChange, onDeleted }: StorageDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!file) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/storage/files/${file.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${file.original_filename}" silindi`);
        onDeleted?.();
        onOpenChange(false);
      } else {
        toast.error(data.error || 'Silme işlemi başarısız');
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Dosyayı Sil
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Bu işlem geri alınamaz!</p>
                <p className="text-muted-foreground mt-1">
                  Dosya hem depolama alanından hem de veritabanından kalıcı olarak silinecektir.
                </p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p><strong>Dosya:</strong> {file.original_filename}</p>
              <p><strong>Boyut:</strong> {formatBytes(file.file_size)}</p>
              {file.users?.full_name && (
                <p><strong>Kullanıcı:</strong> {file.users.full_name}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Siliniyor...' : 'Dosyayı Sil'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
