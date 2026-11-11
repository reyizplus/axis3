'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { toast } from 'sonner';

import dynamic from 'next/dynamic';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FileUploader } from '@/components/upload/FileUploader';
import { createSTLAnalyzer, STLAnalysisResult } from '@/lib/three/stl-analyzer';

const ModelViewer = dynamic(
  () => import('@/components/upload/ModelViewer').then((mod) => mod.ModelViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30 rounded-xl">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-xs text-muted-foreground">3D Viewer yükleniyor...</p>
        </div>
      </div>
    ),
  }
);

import { validateDimensions } from '@/lib/upload/validator';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Box, Ruler, ArrowRight, CheckCircle2, Zap, Shield,
  AlertTriangle, Palette, Sparkles, FileUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const availableColors = [
  { value: 'Natural', label: 'Natural', hex: '#F5F5DC' },
  { value: 'White', label: 'Beyaz', hex: '#FFFFFF' },
  { value: 'Black', label: 'Siyah', hex: '#1A1A1A' },
  { value: 'Red', label: 'Kırmızı', hex: '#FF0000' },
  { value: 'Blue', label: 'Mavi', hex: '#2563EB' },
  { value: 'Green', label: 'Yeşil', hex: '#16A34A' },
  { value: 'Yellow', label: 'Sarı', hex: '#EAB308' },
  { value: 'Orange', label: 'Turuncu', hex: '#EA580C' },
  { value: 'Purple', label: 'Mor', hex: '#9333EA' },
  { value: 'Gray', label: 'Gri', hex: '#6B7280' },
];

const container = { animate: { transition: { staggerChildren: 0.07 } } };
const itemAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export default function UploadPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<STLAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('Natural');
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [dimensionError, setDimensionError] = useState<{
    error: string;
    exceededDimensions?: { x?: number; y?: number; z?: number };
    maxVolume?: { x: number; y: number; z: number };
  } | null>(null);
  const analyzedFilesRef = useRef<Set<string>>(new Set());
  const fileIdRef = useRef<string | null>(null);
  const storagePathRef = useRef<string | null>(null);
  const uploadedFileRef = useRef<File | null>(null);

  const handleUploadComplete = (id: string, path: string, file: File) => {
    setFileId(id);
    fileIdRef.current = id;
    setStoragePath(path);
    storagePathRef.current = path;
    const newFile = new File([file], file.name, { type: file.type });
    setUploadedFile(newFile);
    uploadedFileRef.current = newFile;
    setDimensionError(null);
    analyzedFilesRef.current.clear();
  };

  const handleModelLoad = useCallback(async (_geometry: THREE.BufferGeometry) => {
    const currentFileId = fileIdRef.current;
    const currentStoragePath = storagePathRef.current;
    const currentFile = uploadedFileRef.current;
    if (!currentFileId || !currentFile || !currentStoragePath) {
      toast.error('Yükleme bağlamı bulunamadı');
      return;
    }
    if (analyzedFilesRef.current.has(currentFileId)) return;
    analyzedFilesRef.current.add(currentFileId);
    setIsAnalyzing(true);
    try {
      const supabase = createClient();
      const { data: settingsData, error: settingsError } = await (supabase as any)
        .from('global_settings').select('value').eq('key', 'printer_max_build_volume').maybeSingle();
      if (settingsError || !settingsData) {
        toast.error(settingsError ? 'Yazıcı ayarları yüklenemedi' : 'Yazıcı ayarları bulunamadı');
        setIsAnalyzing(false); return;
      }
      const rawValue = settingsData.value as any;
      const maxBuildVolume = typeof rawValue === 'string'
        ? ((p: any) => ({ x: p.max_x, y: p.max_y, z: p.max_z }))(JSON.parse(rawValue))
        : { x: rawValue.max_x || rawValue.x, y: rawValue.max_y || rawValue.y, z: rawValue.max_z || rawValue.z };

      const analyzer = createSTLAnalyzer();
      const result = await analyzer.analyze(currentFile);
      const validation = validateDimensions(result.dimensions, maxBuildVolume);

      if (!validation.valid) {
        await supabase.storage.from('stl-files').remove([currentStoragePath]);
        await (supabase as any).from('files').delete().eq('id', currentFileId);
        setDimensionError({ error: validation.error || 'Boyut limiti aşıldı', exceededDimensions: validation.exceededDimensions, maxVolume: maxBuildVolume });
        setUploadedFile(null); uploadedFileRef.current = null; setFileId(null); fileIdRef.current = null;
        setStoragePath(null); storagePathRef.current = null; setAnalysis(null);
        toast.error('Model Boyutları Yazıcı Limitlerini Aşıyor', { description: 'Model otomatik olarak silindi. Lütfen modelinizi küçültün.' });
        setIsAnalyzing(false); return;
      }
      setDimensionError(null);
      setAnalysis(result);
      const { error: updateError } = await (supabase as any).from('files').update({
        volume_cm3: result.volume, bounding_box_x: result.dimensions.x, bounding_box_y: result.dimensions.y,
        bounding_box_z: result.dimensions.z, surface_area_cm2: result.surfaceArea,
        triangle_count: result.triangleCount, analysis_status: 'completed',
      }).eq('id', currentFileId);
      toast.success(updateError ? 'Analiz sonuçları kaydedilemedi' : 'Model analizi tamamlandı');
    } catch { toast.error('Analiz sırasında hata oluştu'); }
    finally { setIsAnalyzing(false); }
  }, []);

  const supabase = createClient();

  const handleColorChange = async (color: string) => {
    setSelectedColor(color); if (!fileId) return;
    setIsSavingColor(true);
    try { await (supabase as any).from('files').update({ color }).eq('id', fileId); } catch { toast.error('Renk kaydedilemedi'); }
    finally { setIsSavingColor(false); }
  };

  const handleContinue = () => { if (fileId) router.push(`/upload/${fileId}`); };

  const currentStep = !uploadedFile ? 1 : isAnalyzing ? 2 : !analysis ? 2 : 3;
  const steps = ['Dosya Yükle', 'Analiz', 'Renk & Detay'];

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-6">
        {/* Header */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Model Yükle</h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              3D modelinizi yükleyin, otomatik analiz edelim ve baskı seçeneklerine geçin.
            </p>
          </div>
        </motion.div>

        {/* Step Progress */}
        <motion.div variants={itemAnim}>
          <div className="relative flex items-center gap-0 bg-muted/30 rounded-xl p-1">
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-primary transition-all duration-500 ease-out"
              style={{
                left: '4px',
                width: `${Math.max(33.33, (currentStep / steps.length) * 100 - 0.5)}%`,
              }}
            />
            {steps.map((s, i) => (
              <div key={i} className={cn(
                'relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300',
                currentStep >= i + 1 ? 'text-primary-foreground' : 'text-muted-foreground'
              )}>
                <div className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all',
                  currentStep >= i + 1 ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'
                )}>
                  {currentStep > i + 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{s}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Upload + Results */}
          <div className="space-y-6">
            {/* Upload Zone */}
            <motion.div variants={itemAnim}>
              <Card className="border-2 border-dashed border-border/60 hover:border-primary/30 transition-colors bg-card/50">
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-xl bg-primary/10 p-2.5">
                      <FileUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Dosya Seçin veya Sürükleyin</h3>
                      <p className="text-xs text-muted-foreground">STL formatı desteklenir</p>
                    </div>
                    {uploadedFile && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> Yüklendi
                      </Badge>
                    )}
                  </div>
                  <FileUploader onUploadComplete={handleUploadComplete} onUploadError={(e) => console.error(e)} />
                </div>
              </Card>

              {/* Dimension Error */}
              <AnimatePresence>
                {dimensionError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
                    <Card className="border-red-500/40 bg-red-500/[0.04]">
                      <div className="p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-red-500/10 p-2.5"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
                          <div>
                            <h3 className="font-semibold text-red-600 dark:text-red-400">Boyut Limiti Aşıldı</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">Model boyutları yazıcı limitlerini aşıyor.</p>
                          </div>
                        </div>
                        {dimensionError.exceededDimensions && dimensionError.maxVolume && (
                          <div className="grid grid-cols-3 gap-2">
                            {(['x','y','z'] as const).map(axis => dimensionError.exceededDimensions![axis] ? (
                              <div key={axis} className="rounded-xl bg-red-500/5 border border-red-500/15 p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase mb-1">{axis}</p>
                                <p className="text-lg font-bold text-red-600 dark:text-red-400">{dimensionError.exceededDimensions![axis]!.toFixed(1)} cm</p>
                                <p className="text-[11px] text-muted-foreground">Max: {dimensionError.maxVolume![axis]} cm</p>
                              </div>
                            ) : null)}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground border-t border-red-500/15">
                          <Shield className="h-3.5 w-3.5 text-red-500" />
                          Yazıcı Kapasitesi: {dimensionError.maxVolume?.x} × {dimensionError.maxVolume?.y} × {dimensionError.maxVolume?.z} cm
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Analyzing State */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div variants={itemAnim} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="border-2 border-primary/20 bg-primary/[0.03]">
                    <div className="p-5 flex items-center gap-4">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                      </span>
                      <div>
                        <p className="font-semibold text-sm">Model analiz ediliyor</p>
                        <p className="text-xs text-muted-foreground">Boyut, hacim ve yüzey alanı hesaplanıyor...</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analysis Results */}
            <AnimatePresence>
              {analysis && (
                <motion.div variants={itemAnim} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Color Selection */}
                  <Card className="border-border/60 bg-card/50">
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Palette className="h-4 w-4 text-primary" /> Baskı Rengi
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableColors.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => handleColorChange(c.value)}
                            disabled={isSavingColor}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200',
                              selectedColor === c.value
                                ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                                : 'border-border/60 bg-transparent hover:border-primary/30 hover:bg-primary/5'
                            )}
                          >
                            <div className="h-5 w-5 rounded-full border border-border/50 shadow-inner" style={{ backgroundColor: c.hex }} />
                            <span className="text-sm font-medium">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Analysis Detail */}
                  <Card className="border-border/60 bg-card/50 overflow-hidden">
                    <div className="p-5 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { icon: Box, label: 'Hacim', value: `${analysis.volume.toFixed(2)} cm³` },
                          { icon: Ruler, label: 'Yüzey Alanı', value: `${analysis.surfaceArea.toFixed(2)} cm²` },
                          { icon: Sparkles, label: 'Üçgen Sayısı', value: analysis.triangleCount.toLocaleString() },
                          { icon: Box, label: 'Tahmini Ağırlık', value: `${(analysis.volume * 1.24).toFixed(1)} g` },
                        ].map((item, i) => {
                          const Icon = item.icon;
                          return (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                              <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
                              <div>
                                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                                <p className="text-sm font-semibold">{item.value}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" />Boyutlar (cm)</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { axis: 'X', val: analysis.dimensions.x },
                            { axis: 'Y', val: analysis.dimensions.y },
                            { axis: 'Z', val: analysis.dimensions.z },
                          ].map(d => (
                            <div key={d.axis} className="text-center p-3 rounded-xl bg-muted/40 border border-border/40">
                              <p className="text-[11px] text-muted-foreground mb-0.5">{d.axis}</p>
                              <p className="text-lg font-bold">{d.val.toFixed(1)}</p>
                              <p className="text-[10px] text-muted-foreground">cm</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {fileId && (
                        <div className="pt-2 border-t border-border/50">
                          <Button onClick={handleContinue} size="lg" className="w-full h-12 gap-2 rounded-xl shadow-lg shadow-primary/20">
                            Malzeme Seç ve Fiyat Al <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: 3D Viewer */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <motion.div variants={itemAnim}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> 3D Önizleme
                </h2>
                {analysis && (
                  <Badge variant="outline" className="border-primary/20 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> Analiz Tamam
                  </Badge>
                )}
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50">
                <div className={cn('aspect-square sm:aspect-[4/3]', uploadedFile ? '' : 'flex items-center justify-center')}>
                  <AnimatePresence mode="wait">
                    {uploadedFile ? (
                      <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full">
                        <ModelViewer file={uploadedFile} color={selectedColor} className="h-full w-full" onLoad={handleModelLoad} />
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="relative mb-5">
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-2xl" />
                          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                            <Box className="h-9 w-9 text-primary/60" />
                          </div>
                        </div>
                        <p className="text-base font-semibold text-muted-foreground mb-1">STL Dosyanızı Yükleyin</p>
                        <p className="text-xs text-muted-foreground max-w-xs">Modeliniz otomatik analiz edilecek ve burada 3D olarak görüntülenecek.</p>
                        <div className="flex items-center gap-2 mt-4">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px]"><Zap className="mr-1 h-3 w-3" />Otomatik Analiz</Badge>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px]"><Box className="mr-1 h-3 w-3" />3D Görüntüleme</Badge>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <Zap className="h-3.5 w-3.5 text-primary" /> Hızlı
                  </div>
                  <p className="text-xs text-muted-foreground/80">Saniyeler içinde otomatik analiz</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <Shield className="h-3.5 w-3.5 text-primary" /> Güvenli
                  </div>
                  <p className="text-xs text-muted-foreground/80">Dosyalarınız şifreli saklanır</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="h-4" />
      </motion.div>
    </DashboardShell>
  );
}
