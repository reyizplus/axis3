'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { statusConfig } from '../_components/status-config';
import {
  ArrowLeft, Package, User, MapPin, Calendar, FileText,
  TrendingUp, DollarSign, Zap, Wrench, Box, CheckCircle2, Cpu, Shield,
  Store, Printer, Eye,
} from 'lucide-react';

interface OrderItem3D {
  id: string; file_id: string; filename: string; material_name: string;
  print_setting_name: string; quantity: number; unit_price: number; subtotal: number;
  color?: string;
  price_breakdown?: {
    materialCost: number; machineAmortizationCost: number; electricityCost: number;
    laborCost: number; riskPremium: number; serviceFee: number; profitMargin: number;
  };
}

interface Order {
  id: string; order_number: string; status: string; payment_status: string;
  payment_method: string | null; total_amount: number; subtotal: number;
  discount_amount: number; coupon_code: string | null;
  shipping_cost: number; tax_amount: number; shipping_address: any;
  customer_notes: string | null; estimated_delivery: string | null;
  created_at: string; items: OrderItem3D[]; storeItems: any[];
  user?: { email: string; full_name: string; phone?: string };
}

function f(n: number) { return `₺${n.toFixed(2)}`; }

function MobileSummary({ order, cfg }: { order: Order; cfg: any }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:hidden">
      <div className="p-3 rounded-xl bg-muted/20">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Durum</p>
        <Badge className={`mt-1 text-[10px] font-medium ${cfg?.color || ''}`}>
          {cfg?.label || order.status}
        </Badge>
      </div>
      <div className="p-3 rounded-xl bg-muted/20">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Toplam</p>
        <p className="text-base font-bold text-primary mt-0.5">{f(order.total_amount)}</p>
      </div>
      <div className="p-3 rounded-xl bg-muted/20">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ödeme</p>
        <p className="text-xs font-medium mt-0.5">
          {order.payment_status === 'paid' ? 'Ödendi' : order.payment_status === 'awaiting_confirmation' ? 'İddia' : 'Beklemede'}
        </p>
      </div>
      <div className="p-3 rounded-xl bg-muted/20">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Yöntem</p>
        <p className="text-xs font-medium mt-0.5 truncate">
          {order.payment_method === 'bank_transfer' ? 'EFT/Havale' : order.payment_method || '-'}
        </p>
      </div>
    </div>
  );
}

function DesktopSummary({ order, cfg }: { order: Order; cfg: any }) {
  return (
    <div className="hidden sm:grid grid-cols-2 gap-4">
      <div className="p-3 rounded-xl bg-muted/20">
        <p className="text-xs text-muted-foreground mb-1">Durum</p>
        <Badge className={`text-xs font-medium ${cfg?.color || ''}`}>
          {cfg?.label || order.status}
        </Badge>
      </div>
      <div className="p-3 rounded-xl bg-muted/20">
        <p className="text-xs text-muted-foreground mb-1">Toplam Tutar</p>
        <p className="text-lg font-bold text-primary">{f(order.total_amount)}</p>
      </div>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const mountedRef = useRef(true);

  const loadOrder = async () => {
    try {
      const supabase = createClient();
      const { data: orderData } = await (supabase.from('orders').select('*, user:users!inner(email, full_name, phone)') as any).eq('id', orderId).maybeSingle();
      if (!mountedRef.current) return;
      if (!orderData) { toast.error('Sipariş bulunamadı'); if (mountedRef.current) router.push('/admin/orders'); return; }
      const { data: itemsData } = await (supabase.from('order_items').select('*') as any).eq('order_id', orderId);
      const { data: storeData } = await (supabase.from('store_order_items').select('*') as any).eq('order_id', orderId);
      if (mountedRef.current) setOrder({ ...orderData, items: itemsData || [], storeItems: storeData || [] } as Order);
    } catch { if (mountedRef.current) toast.error('Sipariş yüklenirken hata oluştu'); } finally { if (mountedRef.current) setLoading(false); }
  };

  useEffect(() => { mountedRef.current = true; loadOrder(); return () => { mountedRef.current = false; }; }, [orderId]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (result.success) { toast.success('Durum güncellendi'); await loadOrder(); }
      else toast.error(result.error || 'Güncelleme başarısız');
    } catch { toast.error('Durum güncellenemedi'); } finally { setUpdating(false); }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-7 w-48 mb-6" />
        <Skeleton className="h-32 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-4 py-6 max-w-[1600px] mx-auto">
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="flex flex-col items-center py-12">
            <Package className="h-10 w-10 text-muted-foreground mb-3" />
            <h2 className="text-lg font-bold mb-1">Sipariş Bulunamadı</h2>
            <p className="text-sm text-muted-foreground mb-4">Bu sipariş mevcut değil.</p>
            <Button asChild size="sm"><Link href="/admin/orders"><ArrowLeft className="mr-2 h-4 w-4" />Geri Dön</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasStore = order.storeItems && order.storeItems.length > 0;
  const storeTotal = hasStore ? order.storeItems.reduce((s: any, i: any) => s + i.subtotal, 0) : 0;
  const totalMC = order.items.reduce((s, i) => s + (i.price_breakdown?.materialCost || 0) * i.quantity, 0);
  const totalMAC = order.items.reduce((s, i) => s + (i.price_breakdown?.machineAmortizationCost || 0) * i.quantity, 0);
  const totalEC = order.items.reduce((s, i) => s + (i.price_breakdown?.electricityCost || 0) * i.quantity, 0);
  const totalLC = order.items.reduce((s, i) => s + (i.price_breakdown?.laborCost || 0) * i.quantity, 0);
  const totalRP = order.items.reduce((s, i) => s + (i.price_breakdown?.riskPremium || 0) * i.quantity, 0);
  const totalSF = order.items.reduce((s, i) => s + (i.price_breakdown?.serviceFee || 0) * i.quantity, 0);
  const totalPM = order.items.reduce((s, i) => s + (i.price_breakdown?.profitMargin || 0) * i.quantity, 0);
  const cfg = statusConfig[order.status as keyof typeof statusConfig];

  return (
    <div className="px-4 py-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
          <Link href="/admin/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Sipariş Detayı</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">#{order.order_number}</p>
        </div>
        <Badge className={`text-[10px] sm:text-xs font-medium shrink-0 ${cfg?.color || ''}`}>
          {cfg?.label || order.status}
        </Badge>
      </div>

      {/* Mobile summary cards */}
      <MobileSummary order={order} cfg={cfg} />
      <DesktopSummary order={order} cfg={cfg} />

      <Separator className="my-5" />

      {/* Content */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary shrink-0" />
                Sipariş Ürünleri
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6 space-y-4">
              {order.items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Printer className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold">3D Baskı</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal h-5">{order.items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Box className="h-3.5 w-3.5 text-primary shrink-0" />
                              <h3 className="text-sm font-semibold truncate">{item.filename}</h3>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              <Badge variant="secondary" className="text-[10px] font-normal h-4 px-1.5">{item.material_name}</Badge>
                              <Badge variant="secondary" className="text-[10px] font-normal h-4 px-1.5">{item.print_setting_name}</Badge>
                              {item.color && <Badge className="text-[10px] font-normal h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">{item.color}</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <div className="text-right">
                              <p className="text-sm font-semibold">{f(item.subtotal)}</p>
                              <p className="text-[10px] text-muted-foreground">{f(item.unit_price)} / ad</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                              <Link href={`/admin/orders/${order.id}/file/${item.file_id}`}>
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                        {item.price_breakdown && (
                          <div className="mt-2 pt-2 border-t border-border/40">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Birim Maliyet</p>
                            <div className="space-y-0.5 text-[11px]">
                              {[
                                { label: 'Malzeme', value: item.price_breakdown.materialCost, bg: 'bg-blue-500/5' },
                                { label: 'Amortisman', value: item.price_breakdown.machineAmortizationCost, bg: 'bg-amber-500/5' },
                                { label: 'Elektrik', value: item.price_breakdown.electricityCost, bg: 'bg-yellow-500/5' },
                                { label: 'İşçilik', value: item.price_breakdown.laborCost, bg: 'bg-purple-500/5' },
                                { label: 'Risk Primi', value: item.price_breakdown.riskPremium, bg: 'bg-red-500/5' },
                                { label: 'Servis', value: item.price_breakdown.serviceFee, bg: 'bg-cyan-500/5' },
                              ].map(({ label, value, bg }) => (
                                <div key={label} className={`flex items-center justify-between px-2 py-1 rounded ${bg}`}>
                                  <span className="text-muted-foreground truncate mr-2">{label}</span>
                                  <span className="font-medium shrink-0">{f(value)}</span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between px-2 py-1 rounded bg-green-500/10 font-semibold">
                                <span className="text-muted-foreground">Kar Marjı</span>
                                <span className="text-green-600 dark:text-green-400 shrink-0">{f(item.price_breakdown.profitMargin)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hasStore && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold">Mağaza Ürünleri</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal h-5">{order.storeItems.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {order.storeItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/40">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate">{item.product_name}</span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold shrink-0 ml-2">{f(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {order.items.length === 0 && !hasStore && (
                <p className="text-xs text-muted-foreground text-center py-4">Sipariş kalemi yok</p>
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary shrink-0" />
                Müşteri Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6 space-y-3">
              <div className="p-3 sm:p-4 rounded-xl bg-muted/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hesap</p>
                <p className="text-sm font-semibold break-words">{order.user?.full_name || 'Bilinmiyor'}</p>
                <p className="text-xs text-muted-foreground break-words">{order.user?.email || '-'}</p>
                {order.user?.phone && <p className="text-xs text-muted-foreground mt-0.5">{order.user?.phone}</p>}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-xs sm:text-sm font-semibold">Teslimat</p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-muted/20 text-xs sm:text-sm break-words">
                  {(() => {
                    const a = order.shipping_address;
                    if (!a || typeof a !== 'object') return <span className="text-muted-foreground">Adres yok</span>;
                    if (a.address) return <span className="whitespace-pre-line">{a.address}</span>;
                    return (
                      <div className="space-y-1.5">
                        {a.fullName && <p className="font-medium">{a.fullName}</p>}
                        {a.phone && <p>{a.phone}</p>}
                        <p>{[a.neighborhood, a.street].filter(Boolean).join(', ')}{[a.buildingNo, a.apartmentNo].filter(Boolean).join(' / ') ? ` No: ${[a.buildingNo, a.apartmentNo].filter(Boolean).join(' / ')}` : ''}</p>
                        <p>{[a.district, a.city].filter(Boolean).join(' / ')}{a.zipCode ? ` • ${a.zipCode}` : ''}</p>
                        {a.notes && <p className="text-muted-foreground italic text-[11px]">Not: {a.notes}</p>}
                      </div>
                    );
                  })()}
                </div>
              </div>
              {order.customer_notes && (
                <div>
                  <p className="text-xs font-semibold mb-1">Müşteri Notu</p>
                  <p className="text-xs sm:text-sm text-muted-foreground p-3 sm:p-4 rounded-xl bg-muted/20 break-words">{order.customer_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-base">Sipariş Durumu</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2">
              <Select value={order.status} onValueChange={handleStatusUpdate} disabled={updating}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([v, c]) => (
                    <SelectItem key={v} value={v} className="text-xs sm:text-sm">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Müşteriye otomatik bildirim gönderilir</p>
            </CardContent>
          </Card>

          {/* Cost */}
          <Card className="border-border/50 shadow-sm overflow-hidden border-orange-500/20">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500 shrink-0" />
                Maliyet Analizi
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">Toplam maliyet dağılımı</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-1 text-xs sm:text-sm">
              {[
                { label: 'Malzeme', value: totalMC, icon: Box },
                { label: 'Amortisman', value: totalMAC, icon: Cpu },
                { label: 'Elektrik', value: totalEC, icon: Zap },
                { label: 'İşçilik', value: totalLC, icon: Wrench },
                { label: 'Risk Primi', value: totalRP, icon: Shield },
                { label: 'Servis', value: totalSF, icon: DollarSign },
              ].map(({ label, value, icon: Icn }) => (
                <div key={label} className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-muted/20">
                  <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                    <Icn className="h-3 w-3 shrink-0" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="font-medium shrink-0 ml-2">{f(value)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <span className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5 text-xs sm:text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Kar Marjı
                </span>
                <span className="font-bold text-green-600 dark:text-green-400 shrink-0">{f(totalPM)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-border/50 shadow-sm overflow-hidden border-primary/20">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                Sipariş Özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-1.5 text-xs sm:text-sm">
              {hasStore && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mağaza</span>
                  <span className="font-medium">{f(storeTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kargo</span>
                <span className="font-medium">{f(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span className="font-medium">{f(order.subtotal + order.shipping_cost)}</span>
              </div>
              {(order.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    İndirim{order.coupon_code ? ` (${order.coupon_code})` : ''}
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    -{f(order.discount_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">KDV</span>
                <span className="font-medium">{f(order.tax_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-sm sm:text-base">
                <span>Toplam</span>
                <span className="text-primary">{f(order.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                Tarihler
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Sipariş</span>
                <span className="font-medium text-right break-all">{new Date(order.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Teslimat</span>
                <span className="font-medium text-right">
                  {order.estimated_delivery
                    ? new Date(order.estimated_delivery).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : <span className="text-muted-foreground italic text-xs">Teslimat Belirtilmemiş</span>
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
