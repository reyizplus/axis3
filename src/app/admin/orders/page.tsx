'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { orderService, type Order, type OrderStatus } from '@/lib/services/order-service';
import { createClient } from '@/lib/supabase/client';
import { statusConfig } from './_components/status-config';
import {
  Package,
  Search,
  Eye,
  FileText,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  Clock,
  TrendingUp,
  AlertCircle,
  Store,
  Printer,
  Box,
  MapPin,
  Phone,
  User,
  ChevronRight,
  ArrowRight,
  Truck,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all' | 'pending_bank_transfer'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dialogStoreItems, setDialogStoreItems] = useState<any[]>([]);
  const [loadingStoreItems, setLoadingStoreItems] = useState(false);
  const [cargoCompany, setCargoCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shareTracking, setShareTracking] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const result = await orderService.getAllOrders();
      if (result.success && result.orders) {
        setOrders(result.orders);
      } else {
        toast.error('Siparişler yüklenemedi');
      }
    } catch {
      toast.error('Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: isAdmin } = await supabase.rpc('is_admin');
      if (!isAdmin) { toast.error('Yetkisiz erişim'); router.push('/dashboard'); return; }
      loadOrders();
    };
    init();
  }, [router, loadOrders]);

  const filtered = orders.filter(o => {
    if (search && !o.order_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'pending_bank_transfer') return o.payment_method === 'bank_transfer' && (o.payment_status === 'pending' || o.payment_status === 'awaiting_confirmation');
    if (statusFilter !== 'all') return o.status === statusFilter;
    return true;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['payment_received', 'preparing', 'printing', 'quality_check', 'packaging'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'delivered').length,
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
    setCargoCompany((order as any).cargo_company || '');
    setTrackingNumber((order as any).tracking_number || '');
    setShareTracking(true);
    setDialogStoreItems([]);
    setLoadingStoreItems(true);
    try {
      const supabase = createClient();
      const { data } = await (supabase.from('store_order_items').select('*') as any).eq('order_id', order.id);
      if (data) setDialogStoreItems(data);
    } catch {
      toast.error('Mağaza ürünleri yüklenemedi');
    } finally {
      setLoadingStoreItems(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'shipped') {
        body.cargo_company = cargoCompany;
        body.tracking_number = trackingNumber;
        body.share_tracking_link = shareTracking;
      }
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Sipariş durumu güncellendi');
        await loadOrders();
        setDialogOpen(false);
      } else {
        toast.error(result.error || 'Güncelleme başarısız');
      }
    } catch {
      toast.error('Güncelleme başarısız');
    } finally {
      setUpdating(false);
    }
  };

  const confirmPayment = async (orderId: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from('orders') as any)
        .update({ payment_status: 'paid', status: 'payment_received', updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      toast.success('Ödeme onaylandı');
      await loadOrders();
    } catch {
      toast.error('Ödeme onaylanamadı');
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Siparişler</h1>
          <p className="text-sm text-muted-foreground">Tüm siparişleri görüntüleyin ve yönetin</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Toplam', value: stats.total, icon: ShoppingCart, color: 'bg-primary/10 text-primary' },
          { label: 'Beklemede', value: stats.pending, icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
          { label: 'Hazırlanıyor', value: stats.processing, icon: TrendingUp, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
          { label: 'Teslim Edildi', value: stats.completed, icon: CheckCircle2, color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
        ].map((s, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold tracking-tight mt-1">{s.value}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sipariş numarası ile ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-[220px] h-10">
            <SelectValue placeholder="Durum filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="pending_bank_transfer">Bekleyen EFT/Havale</SelectItem>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">Sipariş bulunamadı</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Filtreleri değiştirerek tekrar deneyin</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((order) => {
                const cfg = statusConfig[order.status];
                const Icon = cfg.icon;
                return (
                  <div key={order.id} className="group p-4 sm:p-5 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{order.order_number}</p>
                            {(order.payment_method === 'bank_transfer' && (order.payment_status === 'pending' || order.payment_status === 'awaiting_confirmation')) && (
                              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('tr-TR', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap lg:shrink-0">
                        <Badge className={`font-medium text-xs ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                        {order.payment_method === 'bank_transfer' && order.payment_status === 'pending' && (
                          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                            Ödeme Bekliyor
                          </Badge>
                        )}
                        {order.payment_method === 'bank_transfer' && order.payment_status === 'awaiting_confirmation' && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                            Ödeme İddia Edildi
                          </Badge>
                        )}
                        <p className="text-sm font-bold tabular-nums whitespace-nowrap">
                          ₺{order.total_amount.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2">
                          {(order.payment_method === 'bank_transfer' && (order.payment_status === 'pending' || order.payment_status === 'awaiting_confirmation')) && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
                              onClick={() => confirmPayment(order.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Onayla</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                            <Link href={`/admin/orders/${order.id}`}>
                              <FileText className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Detay</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Sipariş Detayları
            </DialogTitle>
            <DialogDescription>
              Sipariş #{selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-5 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-1">Durum</p>
                  <Badge className={`text-xs font-medium ${statusConfig[selectedOrder.status].color}`}>
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-1">Toplam Tutar</p>
                  <p className="text-lg font-bold text-primary">₺{selectedOrder.total_amount.toFixed(2)}</p>
                </div>
              </div>

              <Separator />

              {/* Order Items */}
              <div>
                <p className="text-sm font-semibold mb-3">Sipariş Kalemleri</p>
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Printer className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">3D Baskı</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {selectedOrder.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.filename}</p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                <span>{item.material_name}</span>
                                {item.print_setting_name && <><span>•</span><span>{item.print_setting_name}</span></>}
                                {item.color && <><span>•</span><span className="text-primary font-medium">{item.color}</span></>}
                                <span>•</span><span>Adet: {item.quantity}</span>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-primary shrink-0 ml-2">₺{item.subtotal.toFixed(2)}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2 shrink-0" asChild>
                            <Link href={`/admin/orders/${selectedOrder.id}/file/${item.file_id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {dialogStoreItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">Mağaza Ürünleri</span>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {dialogStoreItems.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">Adet: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold text-primary shrink-0 ml-2">₺{item.subtotal.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(!selectedOrder.items || selectedOrder.items.length === 0) && dialogStoreItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{loadingStoreItems ? 'Yükleniyor...' : 'Sipariş kalemi yok'}</p>
                )}
              </div>

              <Separator />

              {/* Address */}
              <div>
                <p className="text-sm font-semibold mb-2">Teslimat Bilgileri</p>
                <div className="bg-muted/20 rounded-xl p-4 space-y-2 text-sm">
                  {(() => {
                    const addr = selectedOrder.shipping_address as any;
                    if (!addr) return <p className="text-muted-foreground">Adres bilgisi yok</p>;
                    if (addr.address) return <p className="text-muted-foreground whitespace-pre-line">{addr.address}</p>;
                    return (
                      <>
                        {addr.fullName && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-primary shrink-0" /><span className="font-medium">{addr.fullName}</span></div>}
                        {addr.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary shrink-0" /><span>{addr.phone}</span></div>}
                        <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /><span>{[addr.neighborhood, addr.street].filter(Boolean).join(', ')}{[addr.buildingNo, addr.apartmentNo].filter(Boolean).join(' / ') ? ` No: ${[addr.buildingNo, addr.apartmentNo].filter(Boolean).join(' / ')}` : ''}<br />{[addr.district, addr.city].filter(Boolean).join(' / ')}{addr.zipCode ? ` • ${addr.zipCode}` : ''}</span></div>
                        {addr.notes && <p className="text-xs text-muted-foreground italic mt-1">Not: {addr.notes}</p>}
                      </>
                    );
                  })()}
                </div>
              </div>

              {selectedOrder.customer_notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold mb-1">Müşteri Notu</p>
                    <p className="text-sm text-muted-foreground bg-muted/20 rounded-xl p-3">{selectedOrder.customer_notes}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Status Update */}
              {!['shipped', 'delivered', 'cancelled', 'refunded'].includes(selectedOrder.status) && (
                <div>
                  <p className="text-sm font-semibold mb-3">Durumu Güncelle</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(statusConfig).map(([status, cfg]) => {
                      const isShipped = status === 'shipped';
                      const Icon2 = cfg.icon;
                      return (
                        <Button
                          key={status}
                          variant={selectedOrder.status === status ? 'default' : 'outline'}
                          size="sm"
                          disabled={updating || selectedOrder.status === status || ['cancelled', 'refunded'].includes(status)}
                          className="justify-start h-9 gap-2"
                          onClick={() => {
                            if (isShipped && !cargoCompany) { toast.error('Kargo firması seçin'); return; }
                            if (isShipped && !trackingNumber) { toast.error('Takip no girin'); return; }
                            handleStatusUpdate(selectedOrder.id, status as OrderStatus);
                          }}
                        >
                          {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon2 className="h-3.5 w-3.5" />}
                          {cfg.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cargo Info */}
              <div>
                <p className="text-sm font-semibold mb-3">Kargo Bilgileri</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Kargo Firması</label>
                    <Select value={cargoCompany} onValueChange={setCargoCompany}>
                      <SelectTrigger className="w-full mt-1 h-10">
                        <SelectValue placeholder="Kargo firması seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="surat">Sürat Kargo</SelectItem>
                        <SelectItem value="ups">UPS</SelectItem>
                        <SelectItem value="aras">Aras Kargo</SelectItem>
                        <SelectItem value="hepsijet">HepsiJet</SelectItem>
                        <SelectItem value="ptt">PTT Kargo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Takip Numarası</label>
                    <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Takip numarasını girin" className="mt-1 h-10" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={shareTracking} onChange={e => setShareTracking(e.target.checked)} className="rounded border-border" />
                    E-postada takip linkini paylaş
                  </label>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
