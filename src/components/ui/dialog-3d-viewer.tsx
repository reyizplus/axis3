/**
 * 3D Viewer Dialog Component
 * Axis3 - Reusable dialog for displaying 3D models
 *
 * MOBILE RESPONSIVE:
 * - Full screen on mobile (max-w-full)
 * - Collapsible specifications sidebar
 * - Optimized height for mobile viewports
 */

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { Box, Ruler, Layers, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SlicerPreview, type SlicePreviewSelection } from '@/components/preview/SlicerPreview';

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
  const [specsOpen, setSpecsOpen] = useState(false);

  // Fix fullscreen exit issue - force layout recalculation
  useEffect(() => {
    if (!open) return;

    const handleFullscreenChange = () => {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Force reflow by reading offsetHeight
        document.body.offsetHeight;
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
          <p className="text-sm text-muted-foreground">{fileName}</p>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-3 gap-2 sm:gap-4 min-h-0">
          {/* 3D Viewer - Full height on mobile */}
          <div className="flex-1 lg:col-span-2 min-h-[300px] sm:min-h-[400px] lg:min-h-0 flex flex-col">
            <SlicerPreview
              selection={slice}
              modelUrl={modelUrl}
              color={color}
              className="flex-1 min-h-0"
            />
          </div>

          {/* Specifications Sidebar - Collapsible on mobile, always visible on desktop */}
          <div className="lg:space-y-4 lg:overflow-y-auto lg:min-h-0">
            {/* Mobile: Collapsible Accordion */}
            <div className="lg:hidden">
              <Accordion>
                <AccordionItem
                  isOpen={specsOpen}
                  onToggle={() => setSpecsOpen(!specsOpen)}
                  trigger={
                    <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        <span className="text-sm font-semibold">Model Özellikleri</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${specsOpen ? 'rotate-180' : ''}`} />
                    </div>
                  }
                  content={
                    <div className="p-3 space-y-3 max-h-[200px] overflow-y-auto">
                      {/* Material & Settings */}
                      {(materialName || printSettingName) && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold flex items-center gap-2">
                            <Layers className="h-3 w-3" />
                            Baskı Ayarları
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {materialName && (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                                {materialName}
                              </Badge>
                            )}
                            {printSettingName && (
                              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">
                                {printSettingName}
                              </Badge>
                            )}
                            {color && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                {color}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Model Specifications */}
                      {specifications && (
                        <>
                          {(materialName || printSettingName) && <Separator className="my-2" />}
                          <div className="space-y-2">
                            {specifications.dimensions && (
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">X</p>
                                  <p className="font-semibold">{specifications.dimensions.x.toFixed(1)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Y</p>
                                  <p className="font-semibold">{specifications.dimensions.y.toFixed(1)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Z</p>
                                  <p className="font-semibold">{specifications.dimensions.z.toFixed(1)}</p>
                                </div>
                              </div>
                            )}

                            {specifications.volume !== undefined && (
                              <div>
                                <p className="text-xs text-muted-foreground">Hacim</p>
                                <p className="text-sm font-bold text-primary">
                                  {specifications.volume.toFixed(2)} cm³
                                </p>
                              </div>
                            )}

                            {specifications.surfaceArea !== undefined && (
                              <div>
                                <p className="text-xs text-muted-foreground">Yüzey Alanı</p>
                                <p className="text-sm font-bold text-primary">
                                  {specifications.surfaceArea.toFixed(2)} cm²
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  }
                />
              </Accordion>
            </div>

            {/* Desktop: Always visible */}
            <div className="hidden lg:block space-y-4">
              {/* Material & Settings */}
              {(materialName || printSettingName) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Baskı Ayarları
                  </h3>
                  {materialName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Malzeme</p>
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        {materialName}
                      </Badge>
                    </div>
                  )}
                  {printSettingName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Kalite</p>
                      <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                        {printSettingName}
                      </Badge>
                    </div>
                  )}
                  {color && (
                    <div>
                      <p className="text-xs text-muted-foreground">Renk</p>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        {color}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Model Specifications */}
              {specifications && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Model Özellikleri
                    </h3>

                    {specifications.dimensions && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Boyutlar (mm)</p>
                        <div className="space-y-1 font-mono text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">X:</span>
                            <span className="font-semibold">{specifications.dimensions.x.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Y:</span>
                            <span className="font-semibold">{specifications.dimensions.y.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Z:</span>
                            <span className="font-semibold">{specifications.dimensions.z.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {specifications.volume !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hacim</p>
                        <p className="text-lg font-bold text-primary">
                          {specifications.volume.toFixed(2)} <span className="text-sm">cm³</span>
                        </p>
                      </div>
                    )}

                    {specifications.surfaceArea !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Yüzey Alanı</p>
                        <p className="text-lg font-bold text-primary">
                          {specifications.surfaceArea.toFixed(2)} <span className="text-sm">cm²</span>
                        </p>
                      </div>
                    )}

                    {specifications.triangleCount !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Üçgen Sayısı</p>
                        <p className="text-sm font-semibold">
                          {specifications.triangleCount.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
