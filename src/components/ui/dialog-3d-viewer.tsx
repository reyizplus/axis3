/**
 * 3D Viewer Dialog Component
 * Axis3 - Reusable dialog for displaying 3D models
 *
 * Görüntüleyici ve yan sütun (baskı ayarları, model özellikleri, takım yolları,
 * dilimleme önizlemesi) `PreviewWorkspace` içinde; burada yalnızca dialog
 * çerçevesi ve tam ekran düzeltmesi var.
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Box } from 'lucide-react';
import { useEffect } from 'react';
import {
  PreviewWorkspace,
  type SlicePreviewSelection,
} from '@/components/preview/PreviewWorkspace';

interface Dialog3DViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelUrl: string;
  fileName: string;
  color?: string;
  specifications?: {
    volume?: number;
    surfaceArea?: number;
    dimensions?: {
      x: number;
      y: number;
      z: number;
    };
    triangleCount?: number;
  };
  materialName?: string;
  printSettingName?: string;
  /**
   * Dilimleme seçimi. Verilirse gerçek takım yolu önizlemesi yüklenir;
   * verilmezse (veya SLA'da) yalnızca STL gösterilir.
   */
  slice?: SlicePreviewSelection | null;
}

export function Dialog3DViewer({
  open,
  onOpenChange,
  modelUrl,
  fileName,
  color = 'Natural',
  specifications,
  materialName,
  printSettingName,
  slice,
}: Dialog3DViewerProps) {
  // Fix fullscreen exit issue - force layout recalculation
  useEffect(() => {
    if (!open) return;

    const handleFullscreenChange = () => {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Force reflow by reading offsetHeight
        void document.body.offsetHeight;
        // Trigger resize event to recalculate layout
        window.dispatchEvent(new Event('resize'));
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl lg:max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden p-2 sm:p-4 lg:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            3D Model Önizleme
          </DialogTitle>
          {/* Radix, DialogContent için bir açıklama bekler: eksikse
              "Missing Description or aria-describedby" uyarısı basılır.
              Dosya adı zaten erişilebilir açıklama görevi görüyor. */}
          <DialogDescription className="truncate">{fileName}</DialogDescription>
        </DialogHeader>

        <PreviewWorkspace
          selection={slice}
          modelUrl={modelUrl}
          color={color}
          materialName={materialName}
          printSettingName={printSettingName}
          specifications={specifications}
          className="min-h-0"
        />
      </DialogContent>
    </Dialog>
  );
}
