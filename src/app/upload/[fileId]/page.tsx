'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MaterialSelector, type Material } from '@/components/pricing/MaterialSelector';
import { QualitySelector, type PrintSetting } from '@/components/pricing/QualitySelector';
import { NozzleSelector } from '@/components/pricing/NozzleSelector';
import { PriceDisplay } from '@/components/pricing/PriceDisplay';
import { inventoryService, type NozzleSize } from '@/lib/services/inventory-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Box, Ruler, Layers, CheckCircle2, Loader2, AlertCircle, Palette, Settings2,
  ShoppingBag, Eye, Printer, FlaskConical, Gauge,
} from 'lucide-react';
import { Dialog3DViewer } from '@/components/ui/dialog-3d-viewer';
import { createClient } from '@/lib/supabase/client';
import { pricingEngine, type PricingInput, type PricingResult } from '@/lib/pricing';
import { cartService } from '@/lib/cart/cart-service';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const colorHexFallback = (color: string, hex: string | null): string => {
  if (hex) return hex;
  const known: Record<string, string> = {
    black: '#000000', siyah: '#000000', white: '#FFFFFF', beyaz: '#FFFFFF',
    red: '#FF0000', kirmizi: '#FF0000', kırmızı: '#FF0000',
    blue: '#0000FF', mavi: '#0000FF',
    green: '#00AA00', yesil: '#00AA00', yeşil: '#00AA00',
    yellow: '#FFD700', sari: '#FFD700', sarı: '#FFD700',
    gray: '#888888', grey: '#888888', gri: '#888888',
    orange: '#FF8C00', turuncu: '#FF8C00',
    purple: '#800080', mor: '#800080', pink: '#FF69B4',
    brown: '#8B4513', kahverengi: '#8B4513',
    transparent: 'transparent', seffaf: 'transparent', şeffaf: 'transparent',
  };
  return known[color.toLowerCase()] || '#ccc';
};

interface FileData {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  volume_cm3: number;
  surface_area_cm2: number;
  bounding_box_x: number;
  bounding_box_y: number;
  bounding_box_z: number;
  triangle_count: number;
  analysis_status: string;
  storage_path: string;
  color?: string;
}

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const itemAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function UploadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const fileId = params.fileId as string;

  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedNozzle, setSelectedNozzle] = useState<NozzleSize | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<PrintSetting | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('Natural');

  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  /** Fiyatın kaynağı: gerçek dilimleme mi, hacim tahmini mi (Görev 9). */
  const [priceSource, setPriceSource] = useState<'slicing' | 'volume' | null>(null);
  const [isSlicing, setIsSlicing] = useState(false);
  /** Sunucudan gelen sipariş politikası (K1); varsayılan güvenli taraf: zorunlu. */
  const [requireSlicing, setRequireSlicing] = useState(true);
  /** Dilimleme hatasından sonra "Tekrar dene" için sayacı artırır. */
  const [retryToken, setRetryToken] = useState(0);

  const [advancedMode, setAdvancedMode] = useState(false);
  const [customLayerHeight, setCustomLayerHeight] = useState(0.2);
  const [customInfill, setCustomInfill] = useState(20);
  const [customSpeed, setCustomSpeed] = useState(1.0);
  const [customLayerThickness, setCustomLayerThickness] = useState(0.05);
  const [customExposureTime, setCustomExposureTime] = useState(8);
  const [inventoryColors, setInventoryColors] = useState<{ color: string; hex: string | null; inStock: boolean }[]>([]);
  const [inventoryCheck, setInventoryCheck] = useState<{ available: boolean; canPreorder: boolean; stockCount: number; estimatedRestockDays: number } | null>(null);
  const [checkingInventory, setCheckingInventory] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [modelUrl, setModelUrl] = useState<string>('');

  async function handleAddToCart() {
    if (!fileData || !selectedMaterial || !pricingResult?.success) {
      toast.error('Lütfen tüm seçimleri tamamlayın'); return;
    }
    if (!advancedMode && !selectedQuality) {
      toast.error('Lütfen baskı kalitesi seçin'); return;
    }
    // K1: fiyat gerçek dilimlemeyle doğrulanmadan sipariş kabul edilmez.
    // Reçine bilinçli olarak istisna (K3).
    if (
      requireSlicing &&
      selectedMaterial.technology !== 'SLA' &&
      priceSource !== 'slicing'
    ) {
      toast.error('Fiyat henüz doğrulanmadı', {
        description: 'Gerçek dilimleme tamamlandığında tekrar deneyin.',
      });
      return;
    }

    setCheckingInventory(true);
    let isPreorderItem = false;
    let preorderDiscount: number | null = null;
    let restockDays: number | undefined;
    try {
      const materialAvail = await inventoryService.checkMaterialAvailability(
        selectedMaterial.id,
        undefined,
        selectedNozzle?.id,
        selectedMaterial.technology
      );

      const knownColor = inventoryColors.find((c) => c.color === selectedColor);
      const availability = knownColor
        ? await inventoryService.checkMaterialAvailability(
            selectedMaterial.id,
            selectedColor,
            selectedNozzle?.id,
            selectedMaterial.technology
          )
        : materialAvail;

      // Preorder is needed only when the requested quantity cannot be covered.
      if (availability.stockCount < quantity) {
        if (!availability.canPreorder) {
          toast.error('Seçilen malzeme/renk için yeterli stok bulunmuyor');
          setCheckingInventory(false);
          return;
        }

        const preorderEnabled = await inventoryService.isPreorderEnabled();
        if (!preorderEnabled) {
          toast.error('Ön sipariş sistemi şu an kapalı');
          setCheckingInventory(false);
          return;
        }

        isPreorderItem = true;
        preorderDiscount =
          availability.preorderDiscountPercent ??
          materialAvail.preorderDiscountPercent ??
          null;
        restockDays = availability.estimatedRestockDays ?? 14;
      }
    } catch { toast.error('Stok kontrolü başarısız'); setCheckingInventory(false); return; }
    setCheckingInventory(false);

    const printSettingId = advancedMode ? 'custom' : selectedQuality!.id;
    const isSla = selectedMaterial?.technology === 'SLA';
    const printSettingName = advancedMode
      ? isSla
        ? `Özel (${customLayerThickness.toFixed(3)}mm, Pozlama:${customExposureTime.toFixed(1)}s, Hız:${customSpeed.toFixed(1)})`
        : `Özel (${customLayerHeight.toFixed(2)}mm, %${customInfill}, Hız:${customSpeed.toFixed(1)})`
      : selectedQuality!.name;

    try {
      await cartService.addItem({
        fileId: fileData.id,
        fileName: fileData.original_filename,
        volumeCm3: fileData.volume_cm3,
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        printSettingId,
        printSettingName,
        quantity,
        unitPrice: pricingResult.breakdown.pricePerUnit,
        totalPrice: pricingResult.totalPrice,
        estimatedTime: typeof pricingResult.estimatedTime === 'number'
          ? pricingResult.estimatedTime
          : pricingResult.estimatedTime.correctedTimeHours,
        deliveryDays: pricingResult.deliveryDays,
        color: selectedColor,
        nozzleSizeId: selectedNozzle?.id,
        nozzleSizeMm: selectedNozzle?.size_mm,
        isPreorder: isPreorderItem,
        preorderDiscountPercent: preorderDiscount,
        estimatedRestockDays: restockDays,
        customLayerHeight: advancedMode && !isSla ? customLayerHeight : undefined,
        customInfillPercentage: advancedMode && !isSla ? customInfill : undefined,
        // Stored as a time multiplier: the engine multiplies print time by it,
        // so "2× faster" becomes 0.5.
        customTimeMultiplier: advancedMode ? 1 / Math.max(0.1, customSpeed) : undefined,
        customLayerThickness: advancedMode && isSla ? customLayerThickness : undefined,
        customExposureTime: advancedMode && isSla ? customExposureTime : undefined,
        priceBreakdown: {
          materialCost: pricingResult.breakdown.material.subtotal,
          machineAmortizationCost: pricingResult.breakdown.machineAmortization.subtotal,
          electricityCost: pricingResult.breakdown.electricity.subtotal,
          laborCost: pricingResult.breakdown.labor.subtotal,
          riskPremium: pricingResult.breakdown.riskPremium.subtotal,
          serviceFee: pricingResult.breakdown.serviceFee,
          profitMargin: pricingResult.breakdown.profitMargin.subtotal,
          subtotal: pricingResult.breakdown.subtotal,
          vatRate: pricingResult.breakdown.vatRate,
          vatAmount: pricingResult.breakdown.vatAmount,
          totalBeforeVat: pricingResult.breakdown.totalBeforeVat,
          total: pricingResult.breakdown.totalPrice,
          pricePerUnit: pricingResult.breakdown.pricePerUnit,
          quantityDiscount: pricingResult.breakdown.quantityDiscount,
          preorderDiscount: pricingResult.breakdown.preorderDiscount,
          detail: {
            material: pricingResult.breakdown.material,
            machineAmortization: { correctedPrintTimeHours: pricingResult.breakdown.machineAmortization.correctedPrintTimeHours, hourlyRate: pricingResult.breakdown.machineAmortization.hourlyRate },
            electricity: pricingResult.breakdown.electricity,
            labor: pricingResult.breakdown.labor,
            riskPremium: pricingResult.breakdown.riskPremium,
            profitMargin: pricingResult.breakdown.profitMargin,
            correctionBreakdown: typeof pricingResult.estimatedTime === 'object' && pricingResult.estimatedTime.correctionBreakdown
              ? pricingResult.estimatedTime.correctionBreakdown
              : { warmUpMinutes: 0, calibrationMinutes: 0, bedPrepMinutes: 0, deadTimePerPartMinutes: 0 },
          },
        },
      });
      toast.success('Sepete eklendi!', { description: `${fileData.original_filename} sepetinize eklendi` });
    } catch { toast.error('Sepete eklenemedi'); }
  }

  async function handleView3D() {
    if (!fileData?.storage_path) { toast.error('Model dosyası bulunamadı'); return; }
    try {
      const supabase = createClient();
      const { data: urlData } = await supabase.storage.from('stl-files').createSignedUrl(fileData.storage_path, 3600);
      if (urlData?.signedUrl) { setModelUrl(urlData.signedUrl); setViewerOpen(true); }
      else toast.error('Model yüklenemedi');
    } catch { toast.error('Model yüklenirken hata oluştu'); }
  }

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data, error } = await (supabase.from('files').select('*') as any).eq('id', fileId).eq('user_id', user.id).is('deleted_at', null).single();
        if (error) throw error;
        if (!data) throw new Error('File not found');
        const fd = data as unknown as FileData;
        setFileData(fd);
        if (fd.color) setSelectedColor(fd.color);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load file'); }
      finally { setLoading(false); }
    })();
  }, [fileId, router]);

  useEffect(() => {
    if (!selectedMaterial) return;
    setSelectedNozzle(null);
    setSelectedQuality(null);
    setInventoryCheck(null);
    (async () => {
      const supabase = createClient();
      const isSla = selectedMaterial.technology === 'SLA';
      const { data: qualities } = await (supabase.from('print_settings').select('*') as any).eq('is_active', true).eq('technology', selectedMaterial.technology).order('time_multiplier', { ascending: true } as any).limit(1);
      if (qualities && qualities.length > 0) {
        const q = qualities[0] as any;
        setSelectedQuality({ id: q.id, name: q.name, technology: q.technology, layerHeight: q.layer_height, layerThickness: q.layer_thickness, infillPercentage: q.infill_percentage || 20, timeMultiplier: q.time_multiplier, qualityPremium: q.quality_premium, isActive: q.is_active, description: q.description, requiresNozzleSizeId: q.requires_nozzle_size_id } as PrintSetting);
        if (isSla && q.layer_thickness) setCustomLayerThickness(q.layer_thickness);
        else if (!isSla && q.layer_height) setCustomLayerHeight(q.layer_height);
      }
      if (selectedMaterial.technology === 'FDM') {
        const [nozzles, inStockIds] = await Promise.all([inventoryService.getAllNozzleSizes(), inventoryService.getAvailableNozzleSizeIds()]);
        const sorted = nozzles.filter(n => n.is_active).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setSelectedNozzle(sorted.find(n => inStockIds.has(n.id)) || sorted[0] || null);
      }
      const avail = await inventoryService.checkMaterialAvailability(selectedMaterial.id, undefined, selectedNozzle?.id, selectedMaterial.technology);
      const invColorMap = new Map(avail.availableColors.map(c => [c.color, c]));
      const definedColors = selectedMaterial.colors || [];
      let merged: { color: string; hex: string | null; inStock: boolean }[];
      if (definedColors.length > 0) {
        merged = definedColors.map(color => { const inv = invColorMap.get(color); return inv ? { color, hex: inv.hex, inStock: inv.inStock } : { color, hex: null, inStock: false }; });
        for (const invColor of avail.availableColors) { if (!definedColors.includes(invColor.color)) merged.push(invColor); }
      } else merged = avail.availableColors;
      setInventoryColors(merged);
      const firstInStock = merged.find(c => c.inStock);
      if (firstInStock) setSelectedColor(firstInStock.color);
      else if (merged.length > 0) setSelectedColor(merged[0].color);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterial?.id]);

  useEffect(() => { if (advancedMode) setSelectedQuality(null); }, [advancedMode]);

  // Price calculation
  //
  // Akış bilinçli olarak iki aşamalı:
  //   1. Hacim tahmini ile anında fiyat gösterilir → etiket "Tahmini".
  //   2. `/api/pricing/slice` gerçek dilimlemeyi tetikler. Sonuç gelince fiyat
  //      AYNI profil hash'i ile yeniden hesaplanır → etiket "Gerçek dilimleme".
  //
  // Seçim değiştiği anda eski kesin fiyat gizlenir: bayat fiyat göstermek
  // müşteriye yanlış tutar gösterip sipariş anında farklı tutar çekmek demek.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      if (!fileData || !selectedMaterial) return;
      if (!advancedMode && !selectedQuality) return;
      const isSla = selectedMaterial.technology === 'SLA';
      if (advancedMode && (isSla ? !customLayerThickness : !customLayerHeight)) return;

      setIsCalculating(true);
      setPricingResult(null);
      setPriceSource(null);
      setIsSlicing(!isSla);

      try {
        // Availability must be colour- and quantity-aware: the same rule the
        // server applies when it creates the order.
        const materialAvail = await inventoryService.checkMaterialAvailability(
          selectedMaterial.id,
          undefined,
          selectedNozzle?.id,
          selectedMaterial.technology
        );
        const knownColor = inventoryColors.find((c) => c.color === selectedColor);
        const availability = knownColor
          ? await inventoryService.checkMaterialAvailability(
              selectedMaterial.id,
              selectedColor,
              selectedNozzle?.id,
              selectedMaterial.technology
            )
          : materialAvail;

        if (cancelled) return;

        const hasEnoughStock = availability.stockCount >= quantity;
        setInventoryCheck({
          available: hasEnoughStock,
          canPreorder: availability.canPreorder,
          stockCount: availability.stockCount,
          estimatedRestockDays: availability.estimatedRestockDays,
        });

        // Preorder is only chosen when the requested quantity cannot be
        // covered, and the discount always comes from the DB-backed
        // availability result — never from the client's own state.
        const isPreorder = !hasEnoughStock && availability.canPreorder;
        const preorderDiscountPercent = isPreorder
          ? availability.preorderDiscountPercent ?? null
          : null;

        const machineType = selectedMaterial.technology === 'SLA' ? 'SLA_STANDARD' : 'FDM_STANDARD';
        // `customSpeed` is a user-facing speed multiplier (2 = twice as fast).
        // The engine expects a time multiplier, which is its inverse.
        const timeMultiplier = advancedMode
          ? 1 / Math.max(0.1, customSpeed)
          : selectedQuality?.timeMultiplier ?? 1;
        const infillPercentage = isSla
          ? 100
          : advancedMode
            ? customInfill
            : selectedQuality?.infillPercentage ?? 20;

        const baseInput: PricingInput = {
          fileId: fileData.id,
          volumeCm3: fileData.volume_cm3,
          materialId: selectedMaterial.id,
          machineType,
          technology: selectedMaterial.technology || 'FDM',
          quantity,
          color: selectedColor,
          nozzleSizeMm: selectedNozzle?.size_mm,
          useGCodeAnalysis: true,
          preorderDiscountPercent,
          printSpeedModifier: selectedMaterial.printSpeedModifier,
          timeMultiplier,
          infillPercentage,
        };

        // 1) Hızlı önizleme: hash yok → motor hacim tahminine düşer.
        const preview = await pricingEngine.calculatePrice(baseInput);
        if (cancelled) return;
        setPricingResult(preview);
        setPriceSource('volume');
        setIsCalculating(false);

        // Reçine bilinçli olarak hacim tahmininde kalır (K3).
        if (isSla) {
          setIsSlicing(false);
          return;
        }

        // 2) Gerçek dilimleme. İstemci yalnızca ID'leri ve özel mod
        // değerlerini gönderir; sayısal ayarları sunucu DB'den çözer.
        const response = await fetch('/api/pricing/slice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            fileId: fileData.id,
            materialId: selectedMaterial.id,
            printSettingId: advancedMode ? 'custom' : selectedQuality?.id,
            nozzleSizeMm: selectedNozzle?.size_mm ?? null,
            custom: advancedMode
              ? {
                  layerHeight: customLayerHeight,
                  infillPercentage: customInfill,
                  speedMultiplier: customSpeed,
                  supportEnabled: true,
                }
              : null,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        if (typeof payload?.requireSlicing === 'boolean') {
          setRequireSlicing(payload.requireSlicing);
        }

        if (!response.ok || !payload?.success) {
          // Uydurma sayı yok: tahmini fiyat "Tahmini" etiketiyle kalır ve
          // sipariş politikası gerekiyorsa buton kilitli olur.
          setIsSlicing(false);
          setPriceSource('volume');
          toast.error(payload?.error ?? 'Dilimleme yapılamadı', {
            description: 'Fiyat tahmini olarak gösteriliyor.',
          });
          return;
        }

        if (payload.source === 'slicing' && typeof payload.profileHash === 'string') {
          const verified = await pricingEngine.calculatePrice({
            ...baseInput,
            slicerProfileHash: payload.profileHash,
          });
          if (cancelled) return;

          setPricingResult(verified);
          // Dilimleme başarılı ama motor hash'li satırı okuyamadıysa fiyat
          // hâlâ tahmindir; "gerçek" diye etiketlemek sessiz sapma olur.
          setPriceSource(verified.estimationSource === 'gcode' ? 'slicing' : 'volume');
          setIsSlicing(false);

          if (verified.success) {
            await pricingEngine.savePricingHistory(
              fileId,
              { ...baseInput, slicerProfileHash: payload.profileHash },
              verified
            );
          }
          return;
        }

        // SLA veya dilimleme atlandı → hacim tahmini geçerli.
        setIsSlicing(false);
        setPriceSource('volume');
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === 'AbortError')) return;
        toast.error('Fiyat hesaplanamadı');
        setIsCalculating(false);
        setIsSlicing(false);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    };

    // 400 ms debounce: slider sürüklerken her karede dilimleme isteği atılmaz.
    const timer = setTimeout(run, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData?.id, selectedMaterial?.id, selectedColor, selectedNozzle?.id, selectedQuality?.id, quantity, advancedMode, customLayerHeight, customInfill, customSpeed, customLayerThickness, customExposureTime, fileId, retryToken]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error || !fileData) {
    return (
      <DashboardShell>
        <div className="p-6 max-w-7xl mx-auto">
          <Card className="relative overflow-hidden border-2 border-destructive/30 bg-card/30 backdrop-blur-sm">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--destructive)/0.03),transparent_70%)]" />
            <CardContent className="relative flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Dosya Bulunamadı</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">{error || 'İstediğiniz dosya bulunamadı veya erişim yetkiniz yok'}</p>
              <Button asChild variant="outline" className="gap-2 rounded-xl">
                <Link href="/upload"><ArrowLeft className="h-4 w-4" /> Yeni Yükleme Yap</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  const isSla = selectedMaterial?.technology === 'SLA';

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-8 p-6 max-w-7xl mx-auto">

        {/* Hero */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9 rounded-xl border border-border/60">
                <Link href="/upload"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                    <Box className="h-3 w-3 text-primary" />
                    Malzeme ve Fiyat Seçimi
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate max-w-lg">{fileData.original_filename}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Malzeme, renk ve baskı kalitesi seçerek fiyat alın</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleView3D}>
              <Eye className="h-4 w-4" /> 3D Önizle
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Selections */}
          <div className="lg:col-span-2 space-y-8">

            {/* File Analysis */}
            <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
                  <Box className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Model Bilgileri</h2>
                  <p className="text-xs text-muted-foreground">STL analiz sonuçları</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Box, label: 'Hacim', value: `${fileData.volume_cm3.toFixed(2)} cm³` },
                  { icon: Ruler, label: 'Boyutlar', value: `${fileData.bounding_box_x.toFixed(1)} × ${fileData.bounding_box_y.toFixed(1)} × ${fileData.bounding_box_z.toFixed(1)} cm`, small: true },
                  { icon: Layers, label: 'Yüzey Alanı', value: `${fileData.surface_area_cm2.toFixed(2)} cm²` },
                  { icon: Box, label: 'Üçgen Sayısı', value: fileData.triangle_count.toLocaleString() },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="relative overflow-hidden rounded-xl border border-border/30 bg-muted/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] text-muted-foreground">{s.label}</span>
                      </div>
                      <p className={cn('font-semibold', s.small ? 'text-xs' : 'text-sm')}>{s.value}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Step 1: Material */}
            <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">1</div>
                <h2 className="font-semibold text-base">Malzeme Seçimi</h2>
              </div>
              <MaterialSelector selectedMaterialId={selectedMaterial?.id} onSelect={setSelectedMaterial} />

              {inventoryCheck && selectedMaterial && (
                <div className={cn(
                  'mt-4 rounded-xl p-4 flex items-start gap-3 border-2',
                  inventoryCheck.available ? 'bg-green-500/5 border-green-500/20' :
                  inventoryCheck.canPreorder ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20',
                )}>
                  {inventoryCheck.available ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  ) : inventoryCheck.canPreorder ? (
                    <ShoppingBag className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="text-xs">
                    {inventoryCheck.available ? (
                      <p className="text-green-700 dark:text-green-400 font-medium">Stokta mevcut</p>
                    ) : inventoryCheck.canPreorder ? (
                      <div>
                        <p className="text-amber-700 dark:text-amber-400 font-medium">Stokta yok, ön sipariş verilebilir</p>
                        <p className="text-amber-600/70 mt-0.5">Tahmini teslimat: {inventoryCheck.estimatedRestockDays} iş günü içinde</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-red-700 dark:text-red-400 font-medium">Bu malzeme şu an stokta yok</p>
                        <p className="text-red-600/70 mt-0.5">Lütfen başka bir malzeme veya renk seçin</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            <Separator className="bg-border/30" />

            {/* Step 2: Color */}
            <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">2</div>
                <h2 className="font-semibold text-base">Renk Seçimi</h2>
              </div>
              <div className="space-y-3">
                <Label htmlFor="color-select" className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Baskı Rengi
                </Label>
                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger id="color-select" className="border-2 border-border/60 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50">
                    <SelectValue placeholder="Renk seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryColors.length > 0 ? inventoryColors.map((c) => (
                      <SelectItem key={c.color} value={c.color}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: colorHexFallback(c.color, c.hex) }} />
                          <span>{c.color}</span>
                          {!c.inStock && <Badge variant="outline" className="text-[10px] ml-1">Ön Sipariş</Badge>}
                        </div>
                      </SelectItem>
                    )) : (
                      <SelectItem value="Natural">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-border bg-[#F5F5DC]" />
                          <span>Natural (Varsayılan)</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Renkler envanterdeki mevcut filamentlere göre listelenir</p>
              </div>
            </motion.div>

            <Separator className="bg-border/30" />

            {/* Step 3: Quality */}
            <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">3</div>
                <h2 className="font-semibold text-base">Baskı Kalitesi</h2>
              </div>
              {!advancedMode && (
                <QualitySelector selectedSettingId={selectedQuality?.id} onSelect={setSelectedQuality} technology={selectedMaterial?.technology} disabled={!selectedMaterial} nozzleSizeId={selectedNozzle?.id} />
              )}
            </motion.div>

            <Separator className="bg-border/30" />

            {/* Step 4: Advanced */}
            {selectedMaterial && (
              <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">4</div>
                  <h2 className="font-semibold text-base">Gelişmiş Seçenekler</h2>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border-2 border-border/40 bg-muted/20 mb-5">
                  <div className="flex items-center gap-3">
                    <Settings2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Manuel Ayar</p>
                      <p className="text-xs text-muted-foreground">Katman kalınlığı, doluluk ve hızı manuel ayarlayın</p>
                    </div>
                  </div>
                  <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} />
                </div>

                {advancedMode && (
                  <div className="space-y-6 pl-5 border-l-2 border-primary/30">
                    {!isSla ? (
                      <>
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Nozul Çapı (mm)</Label>
                          <NozzleSelector selectedNozzleId={selectedNozzle?.id} onSelect={setSelectedNozzle} technology={selectedMaterial?.technology as 'FDM' | 'SLA' | undefined} />
                          <p className="text-xs text-muted-foreground">Daha büyük nozul = daha hızlı baskı, daha az detay</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Katman Yüksekliği (mm)</Label>
                          <div className="flex flex-wrap gap-2">
                            {[0.04, 0.06, 0.08, 0.10, 0.12, 0.16, 0.20, 0.24, 0.28, 0.32, 0.36, 0.40].map(val => (
                              <button key={val} type="button" onClick={() => setCustomLayerHeight(val)}
                                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2', customLayerHeight === val ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/50 text-muted-foreground border-border/40 hover:border-primary/50 hover:text-foreground')}>
                                {val.toFixed(2)}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">Daha ince katman = daha kaliteli, daha yavaş</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Doluluk (%)</Label>
                          <CustomSlider min={5} max={100} step={5} value={customInfill} onChange={setCustomInfill} formatLabel={(v) => '%' + v} />
                          <p className="text-xs text-muted-foreground">Daha yüksek doluluk = daha dayanıklı, daha fazla malzeme</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Baskı Hızı</Label>
                          <CustomSlider min={0.5} max={2.0} step={0.1} value={customSpeed} onChange={setCustomSpeed} formatLabel={(v) => v === 1.0 ? 'Normal' : v < 1.0 ? `%${Math.round(v * 100)} (Yavaş)` : `%${Math.round(v * 100)} (Hızlı)`} />
                          <p className="text-xs text-muted-foreground">Hız arttıkça kalite düşebilir</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Katman Kalınlığı (mm)</Label>
                          <div className="flex flex-wrap gap-2">
                            {[0.025, 0.05, 0.1, 0.15, 0.2].map(val => (
                              <button key={val} type="button" onClick={() => setCustomLayerThickness(val)}
                                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2', customLayerThickness === val ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/50 text-muted-foreground border-border/40 hover:border-primary/50 hover:text-foreground')}>
                                {val.toFixed(3)}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">Daha ince katman = daha kaliteli, daha yavaş</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Pozlama Süresi (s)</Label>
                          <CustomSlider min={2} max={20} step={0.5} value={customExposureTime} onChange={setCustomExposureTime} formatLabel={(v) => v + 's'} />
                          <p className="text-xs text-muted-foreground">Daha uzun pozlama = daha sert, daha yavaş</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Baskı Hızı</Label>
                          <CustomSlider min={0.5} max={2.0} step={0.1} value={customSpeed} onChange={setCustomSpeed} formatLabel={(v) => v === 1.0 ? 'Normal' : v < 1.0 ? `%${Math.round(v * 100)} (Yavaş)` : `%${Math.round(v * 100)} (Hızlı)`} />
                          <p className="text-xs text-muted-foreground">Hız arttıkça kalite düşebilir</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right: Price */}
          <motion.div variants={itemAnim} className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 space-y-4">
              <PriceDisplay
                pricing={pricingResult}
                loading={isCalculating}
                onAddToCart={handleAddToCart}
                disabled={!pricingResult?.success}
                isPreorder={!!(inventoryCheck && !inventoryCheck.available && inventoryCheck.canPreorder)}
                estimatedRestockDays={inventoryCheck?.estimatedRestockDays}
                unavailable={!!(inventoryCheck && !inventoryCheck.available && !inventoryCheck.canPreorder)}
                quantity={quantity}
                onQuantityChange={setQuantity}
                minQuantity={1}
                priceSource={priceSource}
                slicing={isSlicing}
                locked={
                  requireSlicing &&
                  selectedMaterial?.technology !== 'SLA' &&
                  priceSource !== 'slicing'
                }
                onRetry={() => setRetryToken((value) => value + 1)}
              />
            </div>
          </motion.div>
        </div>

        {/* 3D Viewer */}
        {fileData && (
          <Dialog3DViewer
            open={viewerOpen}
            onOpenChange={setViewerOpen}
            modelUrl={modelUrl}
            fileName={fileData.original_filename}
            color={selectedColor}
            materialName={selectedMaterial?.name}
            printSettingName={selectedQuality?.name}
            specifications={{ volume: fileData.volume_cm3, surfaceArea: fileData.surface_area_cm2, dimensions: { x: fileData.bounding_box_x, y: fileData.bounding_box_y, z: fileData.bounding_box_z }, triangleCount: fileData.triangle_count }}
          />
        )}

        <div className="h-4" />
      </motion.div>
    </DashboardShell>
  );
}

function CustomSlider({ min, max, step, value, onChange, formatLabel }: {
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; formatLabel: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{formatLabel(min)}</span>
        <span className="font-semibold text-primary">{formatLabel(value)}</span>
        <span className="text-muted-foreground">{formatLabel(max)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        style={{ background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%, hsl(var(--muted)) 100%)` }}
      />
    </div>
  );
}
