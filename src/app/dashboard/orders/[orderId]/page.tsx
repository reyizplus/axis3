/**
 * Order Detail Page
 * Axis3 - User Order Detail View
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Eye,
  Box,
  Ruler,
  Copy,
  Check,
  Store,
  Printer,
  User,
  Phone,
} from 'lucide-react';
import { AccordionItem } from '@/components/ui/accordion';
import { Dialog3DViewer } from '@/components/ui/dialog-3d-viewer';

interface OrderItem {
  id: string;
  file_id: string;
  filename: string;
  material_name: string;
  print_setting_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  color?: string;
  nozzle_size_id?: string;
  nozzle_size_mm?: number;
  custom_layer_height?: number;
  custom_infill_percentage?: number;
  custom_time_multiplier?: number;
  custom_layer_thickness?: number;
  custom_exposure_time?: number;
  is_preorder?: boolean;
  preorder_discount_percent?: number | null;
  file_details?: {
    original_filename: string;
    file_size: number;
    volume_cm3: number;
    surface_area_cm2: number;
    bounding_box_x: number;
    bounding_box_y: number;
    bounding_box_z: number;
    triangle_count: number;
    storage_path: string;
  };
}

interface StoreItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_id: string | null;
  total_amount: number;
  shipping_cost: number;
  tax_amount: number;
  shipping_address: any;
  billing_address: string;
  estimated_delivery: string;
  created_at: string;
  items: OrderItem[];
  storeItems: StoreItem[];
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name?: string;
  branch_code?: string;
  account_number?: string;
  swift_code?: string;
  currency: string;
  display_order: number;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₺0,00';
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

function formatAddress(address: any): string {
  if (typeof address === 'string') {
    return address;
  }
  if (address && typeof address === 'object') {
    if (address.address) {
      const addr = address.address || '';
      const notes = address.notes || '';
      return notes ? `${addr}\n\nNot: ${notes}` : addr;
    }
    const parts = [];
    if (address.fullName) parts.push(address.fullName);
    if (address.phone) parts.push(`Tel: ${address.phone}`);
    if (address.city || address.district) {
      const loc = [address.district, address.city].filter(Boolean).join(' / ');
      parts.push(loc);
    }
    return parts.join('\n');
  }
  return 'Adres bilgisi yok';
}

function renderAddressDetails(address: any) {
  if (!address || typeof address !== 'object') return null;
  if (address.address) return null;

  return (
    <div className="space-y-1.5">
      {address.fullName && (
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span>{address.fullName}</span>
        </div>
      )}
      {address.phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span>{address.phone}</span>
        </div>
      )}
      <div className="flex items-start gap-2 text-sm">
        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          {[address.neighborhood, address.street].filter(Boolean).join(', ')}
          {[address.buildingNo, address.apartmentNo].filter(Boolean).join(' / ') && (
            <> No: {[address.buildingNo, address.apartmentNo].filter(Boolean).join(' / ')}</>
          )}
          <br />
          {[address.district, address.city].filter(Boolean).join(' / ')}
          {address.zipCode && <> • {address.zipCode}</>}
        </div>
      </div>
      {address.notes && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span className="italic">&quot;{address.notes}&quot;</span>
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; className: string }> = {
    delivered: { label: 'Teslim Edildi', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    shipped: { label: 'Kargoda', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    packaging: { label: 'Paketleniyor', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    quality_check: { label: 'Kalite Kontrolü', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    printing: { label: 'Baskıda', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    preparing: { label: 'Hazırlanıyor', className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
    payment_received: { label: 'Ödeme Alındı', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    pending: { label: 'Beklemede', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    cancelled: { label: 'İptal Edildi', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    refunded: { label: 'İade Edildi', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };

  const config = statusMap[status] || { label: status, className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };

  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}

function getPaymentMethodLabel(method: string | null, paymentStatus: string): string {
  if (!method) {
    return paymentStatus === 'paid' ? 'Ödendi' : 'Beklemede';
  }

  const methodMap: Record<string, string> = {
    CREDIT_CARD: 'Kredi Kartı',
    credit_card: 'Kredi Kartı',
    DEBIT_CARD: 'Banka Kartı',
    debit_card: 'Banka Kartı',
    bank_transfer: 'EFT/Havale',
  };

  return methodMap[method] || method;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [modelUrl, setModelUrl] = useState<string>('');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [copiedDescription, setCopiedDescription] = useState(false);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, type: 'iban' | 'description', ibanId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'iban' && ibanId) {
        setCopiedIban(ibanId);
        setTimeout(() => setCopiedIban(null), 2000);
      } else if (type === 'description') {
        setCopiedDescription(true);
        setTimeout(() => setCopiedDescription(false), 2000);
      }
      toast.success('Kopyalandı!');
    } catch (error) {
      toast.error('Kopyalama başarısız');
    }
  };

  const loadOrderDetails = async () => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch active bank accounts
      const { data: accounts } = await (supabase
        .from('bank_accounts')
        .select('*') as any)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (accounts && accounts.length > 0) {
        const typedAccounts = accounts as unknown as BankAccount[];
        setBankAccounts(typedAccounts);
        // Auto-open first account if only one exists
        if (typedAccounts.length === 1) {
          setOpenAccountId(typedAccounts[0].id);
        }
      }

      // Fetch order with items
      const { data: orderData, error: orderError } = await (supabase
        .from('orders')
        .select('*') as any)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        setError('Sipariş bilgileri yüklenemedi');
        return;
      }

      if (!orderData) {
        setError('Sipariş bulunamadı');
        return;
      }

      // Fetch 3D service items
      const { data: itemsData, error: itemsError } = await (supabase
        .from('order_items')
        .select('*') as any)
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        setError('Sipariş kalemleri yüklenemedi');
        return;
      }

      // Fetch store items
      const { data: storeData, error: storeError } = await (supabase
        .from('store_order_items')
        .select('*') as any)
        .eq('order_id', orderId);

      if (storeError) {
        console.error('Error fetching store order items:', storeError);
        toast.error('Mağaza sipariş ürünleri yüklenemedi');
      }

      // Fetch file details for each 3D item
      const fileIds = (itemsData || []).map((item: any) => item.file_id);
      const { data: filesData } = await supabase
        .from('files')
        .select('id, original_filename, file_size, volume_cm3, surface_area_cm2, bounding_box_x, bounding_box_y, bounding_box_z, triangle_count, storage_path')
        .in('id', fileIds);

      const itemsWithFiles = (itemsData || []).map((item: any) => ({
        ...item,
        file_details: filesData?.find((f: any) => f.id === item.file_id),
      }));

      setOrder({
        ...(orderData as any),
        items: itemsWithFiles,
        storeItems: storeData || [],
      } as Order);
    } catch (error) {
      console.error('Error loading order details:', error);
      setError('Sipariş detayları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (isMounted) {
        await loadOrderDetails();
      }
    };

     
    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleView3D = async (item: OrderItem) => {
    if (!item.file_details?.storage_path) {
      toast.error('Model dosyası bulunamadı');
      return;
    }

    try {
      const supabase = createClient();
      const { data: urlData } = await supabase.storage
        .from('stl-files')
        .createSignedUrl(item.file_details.storage_path, 3600);

      if (urlData?.signedUrl) {
        setModelUrl(urlData.signedUrl);
        setSelectedItem(item);
        setViewerOpen(true);
      } else {
        toast.error('Model yüklenemedi');
      }
    } catch (error) {
      console.error('Failed to load model:', error);
      toast.error('Model yüklenirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div>
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-96" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div>
          <Card className="glass-light dark:glass border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Hata</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => { setError(null); setLoading(true); loadOrderDetails(); }}>
                Tekrar Dene
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell>
        <div>
          <Card className="glass-light dark:glass">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Sipariş Bulunamadı</h2>
              <p className="text-muted-foreground mb-6">Bu sipariş bulunamadı veya erişim yetkiniz yok.</p>
              <Button asChild>
                <Link href="/dashboard/orders">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Siparişlerime Dön
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/orders">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Sipariş Detayları</h1>
              <p className="text-muted-foreground">#{order.order_number}</p>
            </div>
          </div>
          {getStatusBadge(order.status)}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card className="glass-light dark:glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sipariş Ürünleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">

                  {order.items.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Printer className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">3D Baskı Ürünleri</span>
                        <Badge variant="secondary" className="text-xs">{order.items.length}</Badge>
                      </div>
                      <div className="space-y-4">
                        {order.items.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-lg bg-muted/50 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold flex items-center gap-2">
                                  <Box className="h-4 w-4 text-primary" />
                                  {item.filename || item.file_details?.original_filename || 'Dosya'}
                                </h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">{item.material_name}</Badge>
                                  <Badge variant="secondary" className="text-xs">{item.print_setting_name}</Badge>
                                  {item.color && (
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">{item.color}</Badge>
                                  )}
                                  {item.nozzle_size_mm != null && (
                                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600">{item.nozzle_size_mm.toFixed(2)}mm Nozul</Badge>
                                  )}
                                  {item.custom_layer_height != null && (
                                    <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600">{item.custom_layer_height.toFixed(2)}mm Katman</Badge>
                                  )}
                                  {item.custom_infill_percentage != null && (
                                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">%{item.custom_infill_percentage} Doluluk</Badge>
                                  )}
                                  {item.custom_time_multiplier != null && (
                                    <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-600">Hız: {item.custom_time_multiplier.toFixed(1)}x</Badge>
                                  )}
                                  {item.custom_layer_thickness != null && (
                                    <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-600">{item.custom_layer_thickness.toFixed(3)}mm Katman Kalınlığı</Badge>
                                  )}
                                  {item.custom_exposure_time != null && (
                                    <Badge variant="outline" className="text-xs border-rose-500/30 text-rose-600">Pozlama: {item.custom_exposure_time.toFixed(1)}s</Badge>
                                  )}
                                  {item.is_preorder && (
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                      Ön Sipariş{item.preorder_discount_percent != null ? ` (%${item.preorder_discount_percent})` : ''}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                                <p className="text-sm text-muted-foreground">{formatCurrency(item.unit_price)} / adet</p>
                              </div>
                            </div>
                            {item.file_details && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                                <div>
                                  <p className="text-xs text-muted-foreground">Adet</p>
                                  <p className="text-sm font-semibold">{item.quantity}</p>
                                </div>
                                {item.file_details.volume_cm3 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Hacim</p>
                                    <p className="text-sm font-semibold">{item.file_details.volume_cm3.toFixed(2)} cm³</p>
                                  </div>
                                )}
                                {item.file_details.bounding_box_x && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Boyutlar</p>
                                    <p className="text-xs font-mono">
                                      {item.file_details.bounding_box_x.toFixed(0)}×
                                      {item.file_details.bounding_box_y.toFixed(0)}×
                                      {item.file_details.bounding_box_z.toFixed(0)} mm
                                    </p>
                                  </div>
                                )}
                                {item.file_details.triangle_count && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Üçgenler</p>
                                    <p className="text-sm font-semibold">{item.file_details.triangle_count.toLocaleString()}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleView3D(item)} className="w-full">
                              <Eye className="mr-2 h-4 w-4" />3D Modeli Görüntüle
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.storeItems && order.storeItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Store className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Mağaza Ürünleri</span>
                        <Badge variant="secondary" className="text-xs">{order.storeItems.length}</Badge>
                      </div>
                      <div className="space-y-3">
                        {order.storeItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold flex items-center gap-2">
                                  <Package className="h-4 w-4 text-primary" />
                                  {item.product_name}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">Adet: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                                <p className="text-sm text-muted-foreground">{formatCurrency(item.unit_price)} / adet</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.items.length === 0 && (!order.storeItems || order.storeItems.length === 0) && (
                    <p className="text-muted-foreground text-sm py-4 text-center">Sipariş kalemi bulunamadı</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card className="glass-light dark:glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Teslimat Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.shipping_address && typeof order.shipping_address === 'object' && !order.shipping_address.address ? (
                  renderAddressDetails(order.shipping_address)
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {formatAddress(order.shipping_address)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bank Transfer Instructions - Only for unpaid bank_transfer orders */}
            {order.payment_method === 'bank_transfer' && order.payment_status !== 'paid' && bankAccounts.length > 0 && (
              <Card className="glass-light dark:glass border-orange-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5 text-orange-500" />
                    Banka Havalesi Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <p className="text-sm text-muted-foreground mb-3">
                      {bankAccounts.length === 1
                        ? 'Lütfen aşağıdaki hesaba ödemenizi yapın ve ardından "Ödeme Yaptım" butonuna tıklayın.'
                        : 'Aşağıdaki hesaplardan birine ödemenizi yapın ve ardından "Ödeme Yaptım" butonuna tıklayın.'}
                    </p>
                    
                    <div className="space-y-3">
                      {bankAccounts.map((account) => (
                        <AccordionItem
                          key={account.id}
                          isOpen={openAccountId === account.id}
                          onToggle={() => setOpenAccountId(openAccountId === account.id ? null : account.id)}
                          trigger={
                            <div className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <div className="text-left">
                                  <p className="font-medium text-sm">{account.bank_name}</p>
                                  <p className="text-xs text-muted-foreground">{account.account_holder}</p>
                                </div>
                              </div>
                              {openAccountId === account.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          }
                          content={
                            <div className="p-4 space-y-3 bg-gradient-to-br from-background to-muted/20">
                                {/* IBAN with Copy Button */}
                                <div className="p-3 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                                  <div className="flex items-center justify-between mb-1 gap-2">
                                    <p className="text-xs font-medium text-muted-foreground">IBAN</p>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 flex-shrink-0"
                                      onClick={() => copyToClipboard(account.iban, 'iban', account.id)}
                                    >
                                      {copiedIban === account.id ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                  <p className="font-mono text-xs sm:text-sm font-medium break-all">{account.iban}</p>
                                </div>

                                {/* Branch Info */}
                                {account.branch_name && (
                                  <div className="p-3 rounded-lg bg-background border border-muted">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Şube</p>
                                    <p className="text-sm font-medium">{account.branch_name}</p>
                                    {account.branch_code && (
                                      <p className="text-xs text-muted-foreground mt-1">Kod: {account.branch_code}</p>
                                    )}
                                  </div>
                                )}

                                {/* Account Number */}
                                {account.account_number && (
                                  <div className="p-3 rounded-lg bg-background border border-muted">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Hesap No</p>
                                    <p className="font-mono text-xs sm:text-sm font-medium break-all">{account.account_number}</p>
                                  </div>
                                )}
                            </div>
                          }
                        />
                      ))}
                      
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Açıklama (Önemli!)</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 flex-shrink-0"
                            onClick={() => copyToClipboard(order.order_number, 'description')}
                          >
                            {copiedDescription ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <p className="font-mono text-xs sm:text-sm font-bold break-all">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Havale yaparken mutlaka bu kodu açıklama kısmına yazın
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div>
                          <p className="text-xs text-muted-foreground">Ödenecek Tutar</p>
                          <p className="text-2xl font-bold gradient-text">{formatCurrency(order.total_amount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full glow-hover"
                    onClick={async () => {
                      try {
                        const supabase = createClient();
                        
                        // Update order to mark that user claims payment is done
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const { error } = await (supabase.from('orders') as any)
                          .update({
                            payment_status: 'awaiting_confirmation',
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', order.id);
                        
                        if (error) throw error;
                        
                        toast.success('Ödeme bildirimi gönderildi! Ödemeniz onaylandığında bilgilendirileceksiniz.');
                        setTimeout(() => { if (typeof window !== 'undefined') window.location.reload(); }, 1500);
                      } catch (error) {
                        console.error('Payment notification error:', error);
                        toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
                      }
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Ödeme Yaptım
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    Ödemeniz ekibimiz tarafından onaylandıktan sonra siparişiniz işleme alınacaktır.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            <Card className="glass-light dark:glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Ödeme Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ödeme Durumu</span>
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {order.payment_status === 'paid' ? 'Ödendi' : 'Beklemede'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ödeme Yöntemi</span>
                  <span className="font-medium">
                    {getPaymentMethodLabel(order.payment_method, order.payment_status)}
                  </span>
                </div>
                {order.payment_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">İşlem No</span>
                    <span className="font-mono text-xs">{order.payment_id}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="glass-light dark:glass border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Sipariş Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">3D Baskı</span>
                    <span>{formatCurrency(order.items.reduce((s, i) => s + i.subtotal, 0))}</span>
                  </div>
                )}
                {order.storeItems && order.storeItems.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mağaza Ürünleri</span>
                    <span>{formatCurrency(order.storeItems.reduce((s, i) => s + i.subtotal, 0))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ara Toplam</span>
                  <span>{formatCurrency(order.total_amount - order.shipping_cost - order.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kargo</span>
                  <span>{formatCurrency(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">KDV</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Toplam</span>
                  <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Info */}
            <Card className="glass-light dark:glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Teslimat Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sipariş Tarihi</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tahmini Teslimat</span>
                  <span className="font-medium">
                    {order.estimated_delivery && !isNaN(new Date(order.estimated_delivery).getTime())
                      ? new Date(order.estimated_delivery).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Belirtilmemiş'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 3D Viewer Dialog */}
        {selectedItem && (
          <Dialog3DViewer
            open={viewerOpen}
            onOpenChange={setViewerOpen}
            modelUrl={modelUrl}
            fileName={selectedItem.filename || selectedItem.file_details?.original_filename || 'Model'}
            color={selectedItem.color}
            materialName={selectedItem.material_name}
            printSettingName={selectedItem.print_setting_name}
            specifications={selectedItem.file_details ? {
              volume: selectedItem.file_details.volume_cm3,
              surfaceArea: selectedItem.file_details.surface_area_cm2,
              dimensions: {
                x: selectedItem.file_details.bounding_box_x,
                y: selectedItem.file_details.bounding_box_y,
                z: selectedItem.file_details.bounding_box_z,
              },
              triangleCount: selectedItem.file_details.triangle_count,
            } : undefined}
          />
        )}
      </div>
    </DashboardShell>
  );
}
