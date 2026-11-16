'use client';

import { useState } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, Truck, CalendarDays, Clock, AlertCircle, ExternalLink, Copy, Check, MapPin, Box, Building2, CheckCircle2, Package } from 'lucide-react';
import { getCargoCompanies, getTrackingUrl } from '@/lib/services/cargo-service';

interface TrackResult {
  order_number: string;
  tracking_number: string;
  cargo_company: string;
  cargo_status: string;
  shipped_at: string | null;
  estimated_delivery: string | null;
  cargo_price: number | null;
  status: string;
  created_at: string | null;
}

const ORDER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Beklemede', className: 'bg-yellow-500/10 text-yellow-600' },
  payment_received: { label: 'Ödeme Alındı', className: 'bg-emerald-500/10 text-emerald-600' },
  preparing: { label: 'Hazırlanıyor', className: 'bg-blue-500/10 text-blue-600' },
  printing: { label: 'Baskıda', className: 'bg-purple-500/10 text-purple-600' },
  quality_check: { label: 'Kalite Kontrol', className: 'bg-indigo-500/10 text-indigo-600' },
  packaging: { label: 'Paketleniyor', className: 'bg-violet-500/10 text-violet-600' },
  shipped: { label: 'Kargoda', className: 'bg-cyan-500/10 text-cyan-600' },
  delivered: { label: 'Teslim Edildi', className: 'bg-green-500/10 text-green-600' },
  cancelled: { label: 'İptal Edildi', className: 'bg-red-500/10 text-red-600' },
  refunded: { label: 'İade Edildi', className: 'bg-orange-500/10 text-orange-600' },
};

const CARGO_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'İşlem Bekliyor', className: 'bg-yellow-500/10 text-yellow-600' },
  accepted: { label: 'Kargoya Verildi', className: 'bg-blue-500/10 text-blue-600' },
  in_transit: { label: 'Taşımada', className: 'bg-indigo-500/10 text-indigo-600' },
  out_for_delivery: { label: 'Dağıtımda', className: 'bg-purple-500/10 text-purple-600' },
  delivered: { label: 'Teslim Edildi', className: 'bg-emerald-500/10 text-emerald-600' },
  failed: { label: 'Teslimat Başarısız', className: 'bg-red-500/10 text-red-600' },
};

const ORDER_FLOW = [
  { key: 'pending', label: 'Sipariş Alındı' },
  { key: 'payment_received', label: 'Ödeme Alındı' },
  { key: 'preparing', label: 'Hazırlanıyor' },
  { key: 'shipped', label: 'Kargoya Verildi' },
  { key: 'delivered', label: 'Teslim Edildi' },
];

const CARGO_STEPS = [
  { key: 'accepted', label: 'Kargoya Verildi', icon: Box },
  { key: 'in_transit', label: 'Taşımada', icon: Truck },
  { key: 'out_for_delivery', label: 'Dağıtımda', icon: MapPin },
  { key: 'delivered', label: 'Teslim Edildi', icon: CheckCircle2 },
] as const;

function fmtDate(iso: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtDateShort(iso: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function SiparisTakipPage() {
  const [orderInput, setOrderInput] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const companies = getCargoCompanies();

  const copyTracking = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const getOrderFlowIndex = (status: string) => {
    const idx = ORDER_FLOW.findIndex(s => s.key === status);
    return idx >= 0 ? idx : -1;
  };

  const getCargoStepIndex = (status: string) => {
    const idx = CARGO_STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : -1;
  };

  const handleTrack = async () => {
    const trimmed = orderInput.trim();
    if (!trimmed || trimmed.length < 3) {
      setError('Lütfen geçerli bir sipariş numarası girin');
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/cargo/track?order_number=${encodeURIComponent(trimmed)}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Sipariş bilgisi alınamadı');
        return;
      }

      setResult(json.data);
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const company = result ? companies.find(c => c.id === result.cargo_company) : null;
  const orderStatusConfig = result ? ORDER_STATUS_LABELS[result.status] || ORDER_STATUS_LABELS.pending : null;
  const cargoStatusConfig = result ? CARGO_STATUS_LABELS[result.cargo_status] || CARGO_STATUS_LABELS.pending : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="relative py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="max-w-2xl mx-auto px-4 relative z-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mb-4">
                <ShoppingCart className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold gradient-text">Sipariş Takibi</h1>
              <p className="text-muted-foreground mt-2">
                Sipariş numaranızı girerek siparişinizin durumunu ve kargo takibini görüntüleyin.
              </p>
            </div>

            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Sipariş numarası girin..."
                      value={orderInput}
                      onChange={e => { setOrderInput(e.target.value); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleTrack()}
                      className="pl-9 h-11"
                    />
                  </div>
                  <Button onClick={handleTrack} disabled={loading} className="h-11 gap-2 shrink-0">
                    <Search className="h-4 w-4" />
                    {loading ? 'Sorgulanıyor...' : 'Sorgula'}
                  </Button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-red-600 bg-red-500/10 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {result && orderStatusConfig && (
              <Card className="border-border/50 shadow-lg mt-6 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

                {/* Header */}
                <div className="bg-muted/10 border-b border-border/40 px-6 py-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 shrink-0">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">Sipariş #{result.order_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {result.created_at ? `${fmtDateShort(result.created_at)} tarihinde oluşturuldu` : ''}
                      </p>
                    </div>
                    <Badge className={`${orderStatusConfig.className} border-0 text-xs font-semibold px-3 py-1.5 shrink-0`}>
                      {orderStatusConfig.label}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">

                  {/* Order Timeline */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">Sipariş Durumu</p>
                    <div className="relative">
                      {ORDER_FLOW.map((step, idx) => {
                        const currentStep = getOrderFlowIndex(result.status);
                        const isCompleted = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        const isLast = idx === ORDER_FLOW.length - 1;

                        return (
                          <div key={step.key} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all text-xs font-bold ${
                                isCompleted
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-muted/30 text-muted-foreground/30'
                              } ${isCurrent ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background' : ''}`}>
                                {idx + 1}
                              </div>
                              {!isLast && (
                                <div className={`w-0.5 h-8 ${idx < currentStep ? 'bg-primary/40' : 'bg-muted/20'}`} />
                              )}
                            </div>
                            <div className={`pb-6 pt-0.5`}>
                              <p className={`text-sm ${
                                isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground/40'
                              }`}>
                                {step.label}
                              </p>
                              {isCurrent && (
                                <p className="text-xs text-primary font-medium mt-0.5">Güncel durum</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cargo Info — only if shipped/delivered */}
                  {result.cargo_company && company && (
                    <>
                      <div className="border-t border-border/40 pt-5">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">Kargo Bilgisi</p>

                        {/* Company + Status */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/10 rounded-xl p-4 mb-4">
                          <div className="h-14 w-40 flex items-center justify-center bg-white rounded-lg p-2 shrink-0 border border-border/20">
                            <img src={company.logoUrl} alt={company.name} className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{company.name}</p>
                            {cargoStatusConfig && (
                              <Badge className={`${cargoStatusConfig.className} border-0 text-xs mt-1`}>{cargoStatusConfig.label}</Badge>
                            )}
                          </div>
                        </div>

                        {/* Tracking Number */}
                        {result.tracking_number && (
                          <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 mb-4">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Kargo Takip Numarası</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xl font-bold tracking-wider font-mono text-foreground break-all">
                                {result.tracking_number}
                              </span>
                              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                <button
                                  onClick={() => copyTracking(result.tracking_number!)}
                                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                                >
                                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                  {copied ? 'Kopyalandı' : 'Kopyala'}
                                </button>
                                <a
                                  href={getTrackingUrl(company.id, result.tracking_number)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-accent transition-colors"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> Kargo sitesinde takip et
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cargo Timeline */}
                        {result.cargo_status && getCargoStepIndex(result.cargo_status) >= 0 && (
                          <div className="relative pl-1">
                            {CARGO_STEPS.map((step, idx) => {
                              const StepIcon = step.icon;
                              const currentStep = getCargoStepIndex(result.cargo_status);
                              const isCompleted = idx <= currentStep;
                              const isCurrent = idx === currentStep;
                              const isLast = idx === CARGO_STEPS.length - 1;

                              return (
                                <div key={step.key} className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                    <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                                      isCompleted
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted/30 text-muted-foreground/40'
                                    } ${isCurrent ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background' : ''}`}>
                                      {isCompleted && currentStep > idx ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      ) : (
                                        <StepIcon className="h-3.5 w-3.5" />
                                      )}
                                    </div>
                                    {!isLast && (
                                      <div className={`w-0.5 h-8 ${idx < currentStep ? 'bg-primary/40' : 'bg-muted/20'}`} />
                                    )}
                                  </div>
                                  <div className={`pb-6 pt-0.5`}>
                                    <p className={`text-sm ${
                                      isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground/40'
                                    }`}>
                                      {step.label}
                                    </p>
                                    {isCurrent && (
                                      <p className="text-xs text-primary font-medium mt-0.5">Güncel durum</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Cargo Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          {result.shipped_at && (
                            <div className="flex items-center gap-3 bg-muted/10 rounded-lg p-3">
                              <Clock className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Gönderim Tarihi</p>
                                <p className="text-sm font-medium">{fmtDateShort(result.shipped_at)}</p>
                              </div>
                            </div>
                          )}
                          {result.estimated_delivery && (
                            <div className="flex items-center gap-3 bg-muted/10 rounded-lg p-3">
                              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Tahmini Teslimat</p>
                                <p className="text-sm font-medium">{fmtDateShort(result.estimated_delivery)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
