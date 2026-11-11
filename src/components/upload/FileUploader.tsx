/**
 * FileUploader Component - REFINED VERSION
 * Axis3 - "The Axis Look" Design System
 *
 * Features:
 * - Glassmorphism effect
 * - Glow animations on drag
 * - Smooth micro-interactions
 * - Apple-style progress bar
 * - Confetti celebration on success
 */

'use client';

import { useFileUpload } from '@/hooks/useFileUpload';
import { formatFileSize } from '@/lib/upload/validator';
import { Upload, FileIcon, X, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { celebrateUploadSuccess } from '@/lib/celebrations/confetti';
import { useEffect } from 'react';

interface FileUploaderProps {
  onUploadComplete?: (fileId: string, storagePath: string, file: File) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  autoUpload?: boolean;
  className?: string;
}

export function FileUploader({
  onUploadComplete,
  onUploadError,
  maxSizeMB = 50,
  autoUpload = true,
  className,
}: FileUploaderProps) {
  const {
    file,
    uploadProgress,
    isUploading,
    isValidating,
    uploadResult,
    validationError,
    uploadFile,
    clearFile,
    resetUpload,
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useFileUpload({
    maxSizeMB,
    autoUpload,
    onUploadComplete: (result, uploadedFile) => {
      if (result.success && result.fileId && result.storagePath && uploadedFile) {
        onUploadComplete?.(result.fileId, result.storagePath, uploadedFile);
      }
    },
    onUploadError,
  });

  // Handle manual upload (when autoUpload is false)
  const handleManualUpload = () => {
    if (file && !isUploading) {
      uploadFile(file);
    }
  };

  // Trigger confetti on success
  useEffect(() => {
    if (uploadResult?.success) {
      celebrateUploadSuccess();
    }
  }, [uploadResult?.success]);

  // Render upload success state
  if (uploadResult?.success) {
    return (
      <Card className={cn('p-8 glass-light dark:glass transition-smooth', className)}>
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative rounded-full bg-gradient-to-br from-green-400 to-green-600 p-4">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold gradient-text">Yükleme Başarılı!</h3>
            <p className="text-sm text-muted-foreground">
              Dosyanız başarıyla yüklendi ve analiz ediliyor.
            </p>
          </div>
          <Button 
            onClick={resetUpload} 
            variant="outline" 
            size="lg"
            className="glow-hover transition-smooth"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Yeni Dosya Yükle
          </Button>
        </div>
      </Card>
    );
  }

  // Render file preview with progress
  if (file && (isUploading || isValidating)) {
    return (
      <Card className={cn('p-6 glass-light dark:glass transition-smooth', className)}>
        <div className="space-y-6">
          {/* File info */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-3 glow">
                <FileIcon className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFile}
                className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-smooth"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Progress bar - Apple style */}
          {isUploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Yükleniyor...</span>
                <span className="font-bold text-primary">{uploadProgress}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-blue-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="absolute inset-0 shimmer" />
                </div>
              </div>
            </div>
          )}

          {/* Validating state */}
          {isValidating && (
            <div className="flex items-center space-x-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Dosya doğrulanıyor...</span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Render file preview (when autoUpload is false)
  if (file && !autoUpload) {
    return (
      <Card className={cn('p-6 glass-light dark:glass transition-smooth', className)}>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleManualUpload} className="flex-1">
              Yükle
            </Button>
            <Button onClick={clearFile} variant="outline">
              İptal
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Render dropzone - THE AXIS LOOK
  return (
    <Card
      {...getRootProps()}
      className={cn(
        'relative cursor-pointer border-2 border-dashed transition-smooth overflow-hidden',
        'hover:border-primary/50 hover:bg-accent/30',
        isDragActive && 'border-primary bg-primary/5 scale-[1.02]',
        isDragAccept && 'border-green-500 bg-green-500/5 glow',
        isDragReject && 'border-destructive bg-destructive/5',
        validationError && 'border-destructive',
        !isDragActive && 'glass-light dark:glass',
        className
      )}
    >
      <input {...getInputProps()} />
      
      {/* Animated background grid */}
      <div className={cn(
        'absolute inset-0 opacity-30 transition-opacity duration-300',
        isDragActive ? 'opacity-50' : 'opacity-20',
        'grid-bg dark:grid-bg-dark'
      )} />

      <div className="relative flex flex-col items-center justify-center p-12 text-center">
        {/* Icon with glow effect */}
        <div
          className={cn(
            'relative rounded-2xl p-6 mb-6 transition-smooth',
            isDragActive 
              ? 'bg-primary/20 scale-110 glow' 
              : 'bg-gradient-to-br from-primary/10 to-primary/5',
            validationError && 'bg-destructive/10'
          )}
        >
          {/* Glow background */}
          {isDragActive && (
            <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-2xl animate-pulse" />
          )}
          
          {validationError ? (
            <AlertCircle className="relative h-12 w-12 text-destructive" />
          ) : (
            <Upload
              className={cn(
                'relative h-12 w-12 transition-smooth',
                isDragActive ? 'text-primary scale-110' : 'text-primary/70'
              )}
            />
          )}
        </div>

        {/* Text */}
        <div className="space-y-3 max-w-md">
          {validationError ? (
            <>
              <p className="text-base font-semibold text-destructive">
                {validationError}
              </p>
              <p className="text-sm text-muted-foreground">
                Lütfen geçerli bir STL dosyası seçin
              </p>
            </>
          ) : isDragActive ? (
            <>
              <p className="text-lg font-bold gradient-text">
                Dosyayı buraya bırakın...
              </p>
              <p className="text-sm text-muted-foreground">
                Otomatik olarak yüklenecek
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold">
                STL dosyanızı sürükleyip bırakın
              </p>
              <p className="text-sm text-muted-foreground">
                veya dosya seçmek için <span className="text-primary font-medium">tıklayın</span>
              </p>
            </>
          )}
        </div>

        {/* File requirements */}
        <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Maksimum: {maxSizeMB}MB</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Format: .stl</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
