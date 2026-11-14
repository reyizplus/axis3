'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Package, Calculator, FileText, Layers, DollarSign, BarChart3, Loader2, Eye, User, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const ModelViewer = dynamic(() => import('@/components/upload/ModelViewer').then(m => m.ModelViewer), { ssr: false });
import { createClient } from '@/lib/supabase/client';

interface CalculationDetailData {
  id: string;
  file_id?: string | null;
  material_id?: string | null;
  print_setting_id?: string | null;
  volume_cm3?: number | null;
  calculated_price?: number | null;
  price_breakdown?: {
    materialCost?: number;
    machineAmortizationCost?: number;
    electricityCost?: number;
    laborCost?: number;
    riskPremium?: number;
    serviceFee?: number;
    profitMargin?: number;
    subtotal?: number;
    vat?: number;
    total?: number;
    material_cost?: number;
    machine_amortization_cost?: number;
    electricity_cost?: number;
    labor_cost?: number;
    risk_premium?: number;
    service_fee?: number;
    profit_margin?: number;
    total_price?: number;
    [key: string]: unknown;
  } | null;
  settings_snapshot?: Record<string, unknown> | null;
  materials?: {
    name: string;
    code: string;
    technology: string;
  } | null;
  print_settings?: {
    name: string;
    code: string;
    layer_height: number | null;
    infill_percentage: number | null;
    time_multiplier: number | null;
    price_multiplier: number | null;
  } | null;
  files?: {
    id: string;
    filename: string;
    original_filename: string;
    volume_cm3: number | null;
    surface_area_cm2: number | null;
    storage_path?: string;
  } | null;
  created_at?: string;
  user?: {
    id: string;
    email: string | null;
  } | null;
}

interface PriceCalculationDetailDialogProps {
  calculationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(amount: unknown): string {
  if (amount == null) return '-';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '-';
  return `₺${num.toFixed(2)}`;
}

export function PriceCalculationDetailDialog({
  calculationId,
  open,
  onOpenChange,
}: PriceCalculationDetailDialogProps) {
  const [data, setData] = useState<CalculationDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);

  useEffect(() => {
    if (!open || !calculationId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      setModelUrl(null);
      setShowModel(false);
      try {
        const res = await fetch(`/api/admin/price-calculations/${calculationId}`);
        if (!res.ok) throw new Error('Failed to load');
        const result = await res.json();
        setData(result);

        // Generate signed URL for model viewer if file has storage_path
        if (result.files?.storage_path) {
          const supabase = createClient();
          const { data: urlData } = await supabase
            .storage
            .from('stl-files')
            .createSignedUrl(result.files.storage_path, 3600);
          if (urlData?.signedUrl) {
            setModelUrl(urlData.signedUrl);
          }
        }
      } catch {
        setError('Detay yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [open, calculationId]);

  const breakdown = data?.price_breakdown || {};

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-lg max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Fiyat Hesaplama Detayı
            </Dialog.Title>
            <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            {loading ? (
              <div className="space-y-4 py-6">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">{error}</p>
              </div>
            ) : !data ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Veri bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 3D Model Preview */}
                {data.files && modelUrl && (
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

                {/* User Info */}
                {data.user && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-primary" />
                      Kullanıcı Bilgisi
                    </h4>
                    <div className="bg-muted/20 rounded-lg p-4">
                      <div>
                        <span className="text-xs text-muted-foreground">E-posta</span>
                        <p className="text-sm font-medium mt-0.5">{data.user.email ?? '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Model Info */}
                {data.files && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-primary" />
                      Model Bilgisi
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 bg-muted/20 rounded-lg p-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Dosya Adı</span>
                        <p className="text-sm font-medium mt-0.5 truncate">{data.files.original_filename}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Hacim</span>
                        <p className="text-sm font-medium mt-0.5">{data.files.volume_cm3?.toFixed(2) ?? '-'} cm³</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selection Options */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-primary" />
                    Seçilen Seçenekler
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 bg-muted/20 rounded-lg p-4">
                    {data.materials && (
                      <div>
                        <span className="text-xs text-muted-foreground">Malzeme</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm font-medium">{data.materials.name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {data.materials.technology}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {data.print_settings && (
                      <div>
                        <span className="text-xs text-muted-foreground">Baskı Kalitesi</span>
                        <p className="text-sm font-medium mt-0.5">{data.print_settings.name}</p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          {data.print_settings.layer_height != null && (
                            <span>Katman: {data.print_settings.layer_height}mm</span>
                          )}
                          {data.print_settings.infill_percentage != null && (
                            <span>Doluluk: %{data.print_settings.infill_percentage}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {data.volume_cm3 != null && (
                      <div>
                        <span className="text-xs text-muted-foreground">Hacim (Hesaplama)</span>
                        <p className="text-sm font-medium mt-0.5">{data.volume_cm3.toFixed(2)} cm³</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Baskı Süresi (admin only) */}
                {(data.settings_snapshot?.correctedTime || (data as any).print_time_hours) && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-primary" />
                      Baskı Süresi
                    </h4>
                    <div className="space-y-2 bg-muted/20 rounded-lg p-4">
                      {(() => {
                        const ct = data.settings_snapshot?.correctedTime as any;
                        if (ct) {
                          return (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">İdeal Baskı Süresi</span>
                                <span className="font-semibold">{ct.rawPrintTimeHours?.toFixed(2) ?? '-'} saat</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Toplam Süre (ECF dahil)</span>
                                <span className="font-semibold">{ct.correctedTimeHours?.toFixed(2) ?? '-'} saat</span>
                              </div>
                              {ct.correctionBreakdown && (
                                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/30">
                                  <div className="flex justify-between">
                                    <span>Isınma</span>
                                    <span>{ct.correctionBreakdown.warmUpMinutes?.toFixed(0) ?? 0}dk</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Kalibrasyon</span>
                                    <span>{ct.correctionBreakdown.calibrationMinutes?.toFixed(0) ?? 0}dk</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Yatak Hazırlık</span>
                                    <span>{ct.correctionBreakdown.bedPrepMinutes?.toFixed(0) ?? 0}dk</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Ölü Süre</span>
                                    <span>{ct.correctionBreakdown.deadTimePerPartMinutes?.toFixed(0) ?? 0}dk</span>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        }
                        const pt = (data as any).print_time_hours;
                        if (pt != null) {
                          return (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Baskı Süresi</span>
                              <span className="font-semibold">{Number(pt).toFixed(2)} saat</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Fiyat Kırılımı
                  </h4>
                  <div className="space-y-2 bg-muted/20 rounded-lg p-4">
                    {/* Material breakdown with gram info */}
                    <div className="text-xs text-muted-foreground space-y-1 pb-2 border-b border-border/30">
                      {(breakdown.material as any)?.totalGrams != null && (
                        <div className="flex justify-between">
                          <span>Kullanılan Filament</span>
                          <span>{(breakdown.material as any).totalGrams.toFixed(2)} g</span>
                        </div>
                      )}
                      {(breakdown.material as any)?.filamentGrams != null && (
                        <div className="flex justify-between">
                          <span>Model</span>
                          <span>{(breakdown.material as any).filamentGrams.toFixed(2)} g</span>
                        </div>
                      )}
                      {(breakdown.material as any)?.supportGrams != null && (
                        <div className="flex justify-between">
                          <span>Destek</span>
                          <span>{(breakdown.material as any).supportGrams.toFixed(2)} g</span>
                        </div>
                      )}
                      {(breakdown.material as any)?.unitCostPerGram != null && (
                        <div className="flex justify-between">
                          <span>Gram Maliyeti</span>
                          <span>₺{(breakdown.material as any).unitCostPerGram.toFixed(3)}/g</span>
                        </div>
                      )}
                      {(breakdown.material as any)?.wastePercentage != null && (
                        <div className="flex justify-between">
                          <span>Fire (%{(breakdown.material as any).wastePercentage})</span>
                          <span>
                            {(breakdown.material as any).wasteGrams != null
                              ? `${(breakdown.material as any).wasteGrams.toFixed(2)} g`
                              : '-'}
                          </span>
                        </div>
                      )}
                    </div>
                    <PriceRow label="Malzeme Maliyeti" value={(breakdown.material as any)?.subtotal ?? breakdown.materialCost ?? breakdown.material_cost} />
                    <PriceRow label="Makine Amortismanı" value={(breakdown.machineAmortization as any)?.subtotal ?? breakdown.machineAmortizationCost ?? breakdown.machine_amortization_cost} />
                    <PriceRow label="Elektrik Maliyeti" value={(breakdown.electricity as any)?.subtotal ?? breakdown.electricityCost ?? breakdown.electricity_cost} />
                    <PriceRow label="İşçilik Maliyeti" value={(breakdown.labor as any)?.subtotal ?? breakdown.laborCost ?? breakdown.labor_cost} />
                    <PriceRow label="Risk Primi" value={(breakdown.riskPremium as any)?.subtotal ?? (breakdown as any).riskPremium ?? breakdown.risk_premium} />
                    <PriceRow label="Servis Ücreti" value={typeof breakdown.serviceFee === 'number' ? breakdown.serviceFee : (breakdown as any).serviceFee} />
                    <PriceRow label="Kar Marjı" value={(breakdown.profitMargin as any)?.subtotal ?? breakdown.profitMargin ?? breakdown.profit_margin} className="text-primary" />
                    <Separator />
                    <PriceRow label="Toplam Fiyat" value={data.calculated_price ?? (breakdown as any).totalPrice ?? breakdown.totalPrice ?? breakdown.total ?? breakdown.total_price} className="font-bold text-lg text-primary" />
                  </div>
                </div>

                {/* Timestamp */}
                {data.created_at && (
                  <p className="text-xs text-muted-foreground text-right">
                    Hesaplama Tarihi: {new Date(data.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PriceRow({ label, value, className = '' }: { label: string; value: unknown; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${className}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
