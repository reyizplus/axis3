'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart, MapPin, CreditCard, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Package, Clock, Building2, Eye, Store, Printer, Palette, Truck, ShieldCheck, RefreshCw, User, Phone, FileText, Sparkles, ChevronRight,
} from 'lucide-react';
import { cartService, type CartItem } from '@/lib/cart/cart-service';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Dialog3DViewer } from '@/components/ui/dialog-3d-viewer';
import { calculateCartDeliveryDays } from '@/lib/utils/delivery-calculator';
import { paymentGatewayService, type EnabledGateway } from '@/lib/services/payment-gateway-service';
import { getVatRate, getShippingSettings, resetVatRateCache, resetShippingSettingsCache } from '@/lib/services/settings-service';
import { calculateOrderTotals, PRICE_DRIFT_TOLERANCE } from '@/lib/services/order-totals';
import type { PriceChangeDetails } from '@/lib/services/order-totals';
import { requestOrderQuote, toOrderItemInput, toStoreItemInput } from '@/lib/cart/order-quote-client';
import { useCoupon } from '@/lib/cart/use-coupon';
import { CouponInput } from '@/components/checkout/coupon-input';
import {
  getStoreItems,
  clearStoreCart,
  applyStoreItemPrices,
  type StoreItem,
} from '@/lib/cart/store-cart';
import { SavedAddressSelector } from '@/components/checkout/saved-address-selector';
import { saveAddress } from '@/lib/services/address-service';
import { Switch } from '@/components/ui/switch';
import type { AddressFormData } from '@/lib/services/address-service';
import Image from 'next/image';

const GATEWAY_ICONS: Record<string, any> = { CreditCard, Building2 };

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const itemAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedDays, setEstimatedDays] = useState(0);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  const [enabledGateways, setEnabledGateways] = useState<EnabledGateway[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(true);
  const [vatRate, setVatRate] = useState(0.20);
  const [shippingFee, setShippingFee] = useState(0);
  const [freeShippingMinAmount, setFreeShippingMinAmount] = useState(0);
  /** Sunucu teklifi kalemleri doğrulayamazsa (silinmiş dosya, stok vb.). */
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [buildingNo, setBuildingNo] = useState('');
  const [apartmentNo, setApartmentNo] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [saveAddressCheck, setSaveAddressCheck] = useState(true);
  const [addressTitle, setAddressTitle] = useState('Ev');

  /**
   * Sunucu `409 price_changed` döndürdüğünde sepet bu fiyatlarla güncellenir ve
   * müşteriye yeni tutar gösterilir. Kilitlenmeyi önleyen yer burasıdır: sepet
   * güncellenmezse her "Siparişi Tamamla" aynı hatayı verir.
   */
  const [priceChange, setPriceChange] = useState<{
    /** `coupon`: kupon düştüğü için tutar değişti, `prices`: kalem/kargo fiyatı değişti. */
    kind: 'prices' | 'coupon';
    previousTotal: number;
    total: number;
    /** Kupon neden geçersiz oldu (sunucunun mesajı). */
    message?: string;
  } | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);
  const [modelUrl, setModelUrl] = useState<string>('');
  const [fileSpecs, setFileSpecs] = useState<any>(null);

  const hasServiceItems = cartItems.length > 0;
  const hasStoreItems = storeItems.length > 0;

  const loadPaymentGateways = async () => {
    try { setLoadingGateways(true); const g = await paymentGatewayService.getEnabledGateways(); setEnabledGateways(g); if (g.length > 0 && !paymentMethod) setPaymentMethod(g[0].gateway_type); }
    catch (e) { console.error('[Checkout] Failed to load payment gateways:', e); }
    finally { setLoadingGateways(false); }
  };

  const loadCart = async () => {
    try {
      let items = cartService.getItems();
      let sItems = getStoreItems();
      setCartItems(items); setStoreItems(sItems);
      if (items.length === 0 && sItems.length === 0) { toast.error('Sepetiniz boş'); router.push('/cart'); return; }
      if (items.length > 0) { setIsCalculatingDelivery(true); setEstimatedDays(await calculateCartDeliveryDays(items)); }

      setQuoteError(null);

      // Sunucu fiyat otoritesi: siparişi oluşturan servisin aynısı. Gösterilen
      // birim fiyat/toplam, siparişin gerçek tutarıyla eşitlenir. Önceden
      // burada yalnızca yerel (yükleme anındaki) fiyatlar gösteriliyordu ve
      // adet değişimi sonrası sunucu farklı fiyat verince sipariş 409 ile
      // dönüyordu.
      const { quote, error: quoteFailure } = await requestOrderQuote({
        items: items.map(toOrderItemInput),
        storeItems: sItems.map(toStoreItemInput),
      });

      if (quote) {
        if (quote.items.length > 0) await cartService.applyServerPrices(quote.items);
        if (quote.storeItems.length > 0) applyStoreItemPrices(quote.storeItems);

        items = cartService.getItems();
        sItems = getStoreItems();
        setCartItems(items);
        setStoreItems(sItems);

        // KDV/kargo değerleri de sunucudan gelir; modül cache'i eski kalmış
        // olsa bile istemci toplamı sunucununkiyle aynı olur.
        setVatRate(quote.settings.vatRate);
        setShippingFee(quote.settings.shippingFee);
        setFreeShippingMinAmount(quote.settings.freeShippingMinAmount);
      } else {
        if (quoteFailure?.status === 401) {
          router.push('/login?redirectTo=/checkout');
          return;
        }

        // Kalem düzeyinde hata (silinmiş dosya, stok, geçersiz ayar): sipariş
        // son adımda patlamasın, burada göster. Geçici hatalar (429/5xx/ağ)
        // butonu kalıcı olarak kilitlemesin; sipariş anında yeniden denenir.
        if (quoteFailure && quoteFailure.status !== 0) {
          const blocking = [400, 403, 404, 409, 422].includes(quoteFailure.status);
          if (blocking) setQuoteError(quoteFailure.message);
          toast.error(quoteFailure.message);
        }

        resetVatRateCache();
        resetShippingSettingsCache();
        setVatRate(await getVatRate());
        const shipSettings = await getShippingSettings();
        setShippingFee(shipSettings.shippingFee);
        setFreeShippingMinAmount(shipSettings.freeShippingMinAmount);
      }
    } catch { toast.error('Sepet yüklenemedi'); }
    finally { setIsLoading(false); setIsCalculatingDelivery(false); }
  };

  useEffect(() => { loadPaymentGateways(); loadCart(); }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Ad soyad gereklidir';
    if (!phone.trim()) errs.phone = 'Telefon gereklidir';
    if (!city.trim()) errs.city = 'İl gereklidir';
    if (!district.trim()) errs.district = 'İlçe gereklidir';
    if (!neighborhood.trim()) errs.neighborhood = 'Mahalle gereklidir';
    if (!street.trim()) errs.street = 'Cadde/Sokak gereklidir';
    if (!buildingNo.trim()) errs.buildingNo = 'Bina no gereklidir';
    setErrors(errs); return Object.keys(errs).length === 0;
  };

  /**
   * `409 price_changed` yanıtını işler: sepeti sunucunun fiyatlarıyla eşitler.
   * Tutarlar yalnızca gösterim içindir; sipariş yine sunucuda hesaplanır.
   */
  const applyServerPriceChange = async (
    details: PriceChangeDetails,
    previousTotal: number,
    options: { silent?: boolean } = {}
  ) => {
    const changedServiceItems = await cartService.applyServerPrices(details.items);
    const changedStoreItems = applyStoreItemPrices(details.storeItems);

    if (changedServiceItems) setCartItems(cartService.getItems());
    if (changedStoreItems) setStoreItems(getStoreItems());

    // Sapma kalem fiyatlarından değil KDV/kargo ayarlarından da gelebilir;
    // bu servisler modül düzeyinde önbellekliyor, yenilemezsek ikinci deneme
    // yine aynı sapmayı üretir.
    resetVatRateCache();
    resetShippingSettingsCache();
    setVatRate(await getVatRate());
    const shipSettings = await getShippingSettings();
    setShippingFee(shipSettings.shippingFee);
    setFreeShippingMinAmount(shipSettings.freeShippingMinAmount);

    if (options.silent) {
      // Tutar düştü: müşteriye sorulacak bir şey yok, sipariş sessizce
      // yeniden gönderilir.
      setPriceChange(null);
      return;
    }

    setPriceChange({ kind: 'prices', previousTotal, total: details.totals.total });
    toast.error(
      'Sepet fiyatları güncellendi. Yeni tutarı kontrol edip siparişi tekrar onaylayın.'
    );
  };

  const handlePlaceOrder = async () => {
    if (!validate()) { toast.error('Lütfen formu eksiksiz doldurun'); return; }
    if (!hasServiceItems && !hasStoreItems) { toast.error('Sepetiniz boş'); return; }
    setIsSubmitting(true);
    setPriceChange(null);

    const submitOrder = (expectedTotal: number) =>
      fetch('/api/v1/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Sipariş sunucuda oluşturulur: fiyat, stok ve sahiplik doğrulaması
          // API tarafında yapılır. İstemci yalnızca referans ve adres gönderir.
          items: cartItems.map(toOrderItemInput),
          storeItems: storeItems.map(toStoreItemInput),
          address: {
            fullName,
            phone,
            city,
            district,
            neighborhood,
            street,
            buildingNo,
            apartmentNo,
            zipCode,
            notes: deliveryNotes,
          },
          paymentMethod,
          deliveryNotes,
          couponCode: couponState.coupon?.code,
          expectedTotal,
        }),
      });

    let expectedTotal = Math.round(total * 100) / 100;

    try {
      let response = await submitOrder(expectedTotal);
      let result = await response.json().catch(() => null);

      /**
       * `409 price_changed`: sipariş oluşmadı, yalnızca fiyat farkı var.
       *
       * Tutar düştüyse müşteriye sorulacak bir şey yok; sepeti sunucu
       * fiyatlarıyla eşitleyip aynı siparişi sessizce tekrar gönderiyoruz
       * (tek tıkla sipariş). Yalnızca tutar ARTTIYSA onay isteniyor, aksi
       * halde kullanıcı haber verilmeden daha fazla ödemiş olur.
       */
      for (let attempt = 0; attempt < 3; attempt++) {
        if (
          !(
            response.status === 409 &&
            result?.code === 'price_changed' &&
            result?.details
          )
        ) {
          break;
        }

        const details = result.details as PriceChangeDetails;
        const newTotal = details.totals.total;
        const isIncrease = newTotal > expectedTotal + PRICE_DRIFT_TOLERANCE;

        await applyServerPriceChange(details, expectedTotal, { silent: !isIncrease });
        expectedTotal = newTotal;

        if (isIncrease) return;

        response = await submitOrder(expectedTotal);
        result = await response.json().catch(() => null);
      }

      if (!response.ok || !result?.success) {
        // Kupon sunucuda geçersiz (ör. tek kullanımlık kupon kullanılmış).
        // Kupon sessizce düşüp tutar değişmesin: kaldır, yeni tutarı göster ve
        // siparişi ancak müşteri tekrar onayladığında oluştur.
        if (result?.code === 'coupon_invalid') {
          const details = result.details as
            | { reason?: string; totals?: { total?: number } }
            | undefined;
          couponState.remove();
          const newTotal = Number(details?.totals?.total);
          setPriceChange({
            kind: 'coupon',
            previousTotal: expectedTotal,
            total: Number.isFinite(newTotal) ? newTotal : expectedTotal,
            message: typeof result.error === 'string' ? result.error : undefined,
          });
          toast.error(
            `${result.error || 'Kupon geçersiz'} Kupon kaldırıldı; yeni tutarı görüp siparişi tekrar onaylayın.`
          );
          return;
        }

        throw new Error(result?.error || 'Sipariş oluşturulamadı');
      }

      const order = result.order as { id: string; orderNumber: string; total: number };

      // Save address if requested
      if (saveAddressCheck) {
        try {
          await saveAddress({
            title: addressTitle,
            full_name: fullName.trim(),
            phone: phone.trim(),
            city: city.trim(),
            district: district.trim(),
            neighborhood: neighborhood.trim(),
            street: street.trim(),
            building_no: buildingNo.trim(),
            apartment_no: apartmentNo.trim(),
            zip_code: zipCode.trim(),
          });
        } catch { /* silently fail */ }
      }

      if (paymentMethod === 'iyzico') {
        toast.loading('Ödeme sayfasına yönlendiriliyorsunuz...', { id: 'payment-init' });
        const paymentData = await (await fetch('/api/v1/payments/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id }) })).json();
        if (paymentData.success && paymentData.paymentPageUrl) {
          await cartService.clearCart(); clearStoreCart();
          if (typeof window !== 'undefined') window.location.href = paymentData.paymentPageUrl;
        } else {
          toast.error(paymentData.error || 'Ödeme başlatılamadı', { id: 'payment-init' });
          // Ödeme başlatılamadı: siparişi iptal et ve rezerve edilen stoğu geri bırak.
          try {
            await fetch(`/api/v1/orders/${order.id}/cancel`, { method: 'POST' });
          } catch { /* stok iadesi callback tarafında da idempotent */ }
          router.push('/dashboard/orders');
        }
      } else {
        await cartService.clearCart(); clearStoreCart();
        toast.success('Sipariş oluşturuldu');
        router.push(`/checkout/success?orderId=${order.id}&method=${paymentMethod}`);
      }
    } catch (err: any) { console.error(err); toast.error(err.message || 'Sipariş oluşturulamadı'); }
    finally { setIsSubmitting(false); }
  };

  const handleAddressSelect = (data: AddressFormData, addressId?: string) => {
    setFullName(data.full_name);
    setPhone(data.phone);
    setCity(data.city);
    setDistrict(data.district);
    setNeighborhood(data.neighborhood);
    setStreet(data.street);
    setBuildingNo(data.building_no);
    setApartmentNo(data.apartment_no);
    setZipCode(data.zip_code);
    setSelectedAddressId(addressId);
    setSaveAddressCheck(false);
  };

  const handleView3D = async (item: CartItem) => {
    try {
      const supabase = createClient();
      const { data: fileData } = await (supabase.from('files').select('storage_path, volume_cm3, surface_area_cm2, bounding_box_x, bounding_box_y, bounding_box_z, triangle_count') as any).eq('id', item.fileId).single();
      if (!fileData?.storage_path) { toast.error('Model dosyası bulunamadı'); return; }
      const { data: urlData } = await supabase.storage.from('stl-files').createSignedUrl(fileData.storage_path, 3600);
      if (urlData?.signedUrl) { setModelUrl(urlData.signedUrl); setSelectedItem(item); setFileSpecs({ volume: fileData.volume_cm3, surfaceArea: fileData.surface_area_cm2, dimensions: { x: fileData.bounding_box_x, y: fileData.bounding_box_y, z: fileData.bounding_box_z }, triangleCount: fileData.triangle_count }); setViewerOpen(true); }
      else toast.error('Model yüklenemedi');
    } catch { toast.error('Model yüklenirken hata oluştu'); }
  };

  const subtotal3D = cartItems.reduce((s, i) => s + i.totalPrice, 0);
  const subtotalStore = storeItems.reduce((s, i) => s + i.totalPrice, 0);
  const subtotalItems = subtotal3D + subtotalStore;

  // The code applied in the cart is read back here; any cart change since then
  // is re-validated silently before the order is sent.
  const couponState = useCoupon({
    itemsSubtotal: subtotalItems,
    serviceSubtotal: subtotal3D,
    storeSubtotal: subtotalStore,
  });

  // Same pure function the server uses, so the preview cannot drift from the
  // amount that is actually charged by a rounding difference.
  const {
    subtotal,
    discount,
    shipping: computedShipping,
    vat,
    total,
  } = calculateOrderTotals({
    itemsSubtotal: subtotalItems,
    vatRate,
    shippingFee,
    freeShippingMinAmount,
    discountAmount: couponState.coupon?.discountAmount,
    freeShipping: couponState.coupon?.freeShipping,
  });
  // "Ara Toplam" indirimli ürünler + kargo; KDV bu tutar üzerinden bir kez eklenir.
  const summarySubtotal = subtotal - discount + computedShipping;
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0) + storeItems.reduce((s, i) => s + i.quantity, 0);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-8">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6"><Skeleton className="h-[500px] rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>
            <Skeleton className="h-[400px] rounded-2xl" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-8">
        {/* Hero */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative">
            <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 h-8 gap-1 text-muted-foreground hover:text-foreground">
              <Link href="/cart"><ArrowLeft className="h-3.5 w-3.5" /> Sepete Dön</Link>
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                    <CreditCard className="h-3 w-3 text-primary" />
                    Ödeme
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Ödemeye Geç</h1>
                <p className="mt-1 text-sm text-muted-foreground">Teslimat bilgilerinizi girin ve siparişinizi tamamlayın</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Package className="h-4 w-4" />
                <span className="font-medium text-foreground">{totalItems}</span> ürün
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Info */}
            <motion.div variants={itemAnim}>
              <Card className="border-2 border-border/60 bg-card/50 backdrop-blur-sm">
                <div className="p-5 sm:p-6 space-y-6">
                  <div className="flex items-center gap-2 pb-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Teslimat Bilgileri</h2>
                  </div>

                  <SavedAddressSelector onSelect={handleAddressSelect} selectedId={selectedAddressId} />

                  {/* Step 1 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">1</div>
                      <span className="text-sm font-medium">Kişisel Bilgiler</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-10">
                      {[
                        { id: 'fullName', label: 'Ad Soyad', value: fullName, set: setFullName, err: errors.fullName, icon: User, placeholder: 'Adınız Soyadınız' },
                        { id: 'phone', label: 'Telefon', value: phone, set: setPhone, err: errors.phone, icon: Phone, placeholder: '05XX XXX XX XX' },
                      ].map(f => {
                        const Icon = f.icon;
                        return (
                          <div key={f.id} className="space-y-1.5">
                            <label htmlFor={f.id} className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Icon className="h-3 w-3" />{f.label} <span className="text-destructive">*</span></label>
                            <input id={f.id} value={f.value} onChange={e => { f.set(e.target.value); if (f.err) setErrors(p => ({ ...p, [f.id]: '' })); }} placeholder={f.placeholder}
                              className={cn('w-full h-10 px-3 rounded-xl border-2 bg-background/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all', f.err ? 'border-destructive' : 'border-border/60')}
                            />
                            {f.err && <p className="text-[11px] text-destructive">{f.err}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-border/50" />

                  {/* Step 2 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">2</div>
                      <span className="text-sm font-medium">Adres Bilgileri</span>
                    </div>
                    <div className="space-y-4 pl-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['city', 'district'].map(f => (
                          <div key={f} className="space-y-1.5">
                            <label htmlFor={f} className="text-xs font-medium text-muted-foreground capitalize">{f === 'city' ? 'İl' : 'İlçe'} <span className="text-destructive">*</span></label>
                            <input id={f} value={f === 'city' ? city : district}
                              onChange={e => { f === 'city' ? setCity(e.target.value) : setDistrict(e.target.value); if (errors[f]) setErrors(p => ({ ...p, [f]: '' })); }}
                              placeholder={f === 'city' ? 'İstanbul' : 'Kadıköy'}
                              className={cn('w-full h-10 px-3 rounded-xl border-2 bg-background/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all', errors[f] ? 'border-destructive' : 'border-border/60')}
                            />
                            {errors[f] && <p className="text-[11px] text-destructive">{errors[f]}</p>}
                          </div>
                        ))}
                      </div>
                      {['neighborhood', 'street'].map(f => (
                        <div key={f} className="space-y-1.5">
                          <label htmlFor={f} className="text-xs font-medium text-muted-foreground">{f === 'neighborhood' ? 'Mahalle' : 'Cadde / Sokak'} <span className="text-destructive">*</span></label>
                          <input id={f} value={f === 'neighborhood' ? neighborhood : street}
                            onChange={e => { f === 'neighborhood' ? setNeighborhood(e.target.value) : setStreet(e.target.value); if (errors[f]) setErrors(p => ({ ...p, [f]: '' })); }}
                            placeholder={f === 'neighborhood' ? 'Caferağa Mahallesi' : 'Atatürk Caddesi No:55'}
                            className={cn('w-full h-10 px-3 rounded-xl border-2 bg-background/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all', errors[f] ? 'border-destructive' : 'border-border/60')}
                          />
                          {errors[f] && <p className="text-[11px] text-destructive">{errors[f]}</p>}
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-3">
                        {['buildingNo', 'apartmentNo', 'zipCode'].map(f => (
                          <div key={f} className="space-y-1.5">
                            <label htmlFor={f} className="text-xs font-medium text-muted-foreground">{f === 'buildingNo' ? 'Bina No' : f === 'apartmentNo' ? 'Daire' : 'Posta Kodu'} {f !== 'apartmentNo' && <span className="text-destructive">*</span>}</label>
                            <input id={f} value={f === 'buildingNo' ? buildingNo : f === 'apartmentNo' ? apartmentNo : zipCode}
                              onChange={e => { f === 'buildingNo' ? setBuildingNo(e.target.value) : f === 'apartmentNo' ? setApartmentNo(e.target.value) : setZipCode(e.target.value); if (errors[f]) setErrors(p => ({ ...p, [f]: '' })); }}
                              placeholder={f === 'buildingNo' ? '12' : f === 'apartmentNo' ? '5' : '34710'}
                              className={cn('w-full h-10 px-3 rounded-xl border-2 bg-background/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all', errors[f] ? 'border-destructive' : 'border-border/60')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/50" />

                  {/* Step 3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">3</div>
                      <span className="text-sm font-medium">Teslimat Notu <span className="text-muted-foreground font-normal">(isteğe bağlı)</span></span>
                    </div>
                    <div className="pl-10 space-y-1.5">
                      <label htmlFor="deliveryNotes" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><FileText className="h-3 w-3" />Sipariş Notu</label>
                      <textarea id="deliveryNotes" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} rows={2}
                        placeholder="Özel talimatlar, zil kodu, yön tarifi, vb."
                        className="w-full min-h-[56px] px-3 py-2.5 rounded-xl border-2 border-border/60 bg-background/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border/50" />

                  {/* Save Address */}
                  <div className="space-y-3 pl-10">
                    <div className="flex items-center gap-2">
                      <Switch checked={saveAddressCheck} onCheckedChange={setSaveAddressCheck} id="saveAddress" />
                      <label htmlFor="saveAddress" className="text-xs font-medium cursor-pointer">Bu adresi kaydet</label>
                    </div>
                    {saveAddressCheck && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Baslik:</span>
                        {['Ev', 'Is', 'Diger'].map(t => (
                          <Button key={t} type="button" variant={addressTitle === t ? 'default' : 'outline'} size="sm"
                            onClick={() => setAddressTitle(t)} className="h-7 text-xs px-2.5">{t}</Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Payment Method */}
            <motion.div variants={itemAnim}>
              <Card className="border-2 border-border/60 bg-card/50 backdrop-blur-sm">
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-1">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Ödeme Yöntemi</h2>
                    {loadingGateways && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />}
                  </div>
                  {loadingGateways ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : enabledGateways.length === 0 ? (
                    <div className="rounded-xl bg-orange-500/[0.05] border border-orange-500/15 p-4 flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div><p className="text-sm font-medium text-orange-600">Ödeme Yöntemleri Hazırlanıyor</p><p className="text-xs text-muted-foreground mt-0.5">Şu anda aktif ödeme yöntemi bulunmamaktadır.</p></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {enabledGateways.map(gateway => {
                        const Icon = GATEWAY_ICONS[gateway.icon_name] || CreditCard;
                        return (
                          <div key={gateway.id}
                            onClick={() => setPaymentMethod(gateway.gateway_type)}
                            className={cn(
                              'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                              paymentMethod === gateway.gateway_type ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/30 bg-transparent'
                            )}
                          >
                            <div className={cn('mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center', paymentMethod === gateway.gateway_type ? 'border-primary' : 'border-muted-foreground/40')}>
                              {paymentMethod === gateway.gateway_type && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Icon className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold">{gateway.display_name}</span>
                                {!!gateway.metadata.badge && (
                                  <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', gateway.metadata.badge_color === 'green' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20')}>{gateway.metadata.badge as string}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{gateway.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Order Items Summary */}
            <motion.div variants={itemAnim}>
              <Card className="border-2 border-border/60 bg-card/50 backdrop-blur-sm">
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-1">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Sipariş Özeti</h2>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{totalItems} ürün</Badge>
                  </div>

                  {hasServiceItems && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Printer className="h-3.5 w-3.5 text-primary" /> 3D Baskı Hizmeti
                      </div>
                      {cartItems.map((item, idx) => (
                        <div key={item.id} className="rounded-xl bg-muted/30 border border-border/40 p-4 flex items-start gap-4">
                          <div className="rounded-lg bg-primary/10 p-2.5 shrink-0"><Package className="h-5 w-5 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold truncate">{item.fileName}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.materialName}</Badge>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.printSettingName}</Badge>
                                  {item.color && <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1"><Palette className="h-2.5 w-2.5" />{item.color}</Badge>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-primary">{item.totalPrice.toFixed(2)} TL</p>
                                {item.quantity > 1 && <p className="text-[10px] text-muted-foreground">{item.unitPrice.toFixed(2)} TL/adet</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                              <span>Adet: {item.quantity}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleView3D(item)} className="h-7 mt-2 text-[11px] gap-1 rounded-lg">
                              <Eye className="h-3 w-3" /> 3D Görüntüle
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {hasStoreItems && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Store className="h-3.5 w-3.5 text-primary" /> Mağaza Ürünleri
                      </div>
                      {storeItems.map(item => (
                        <div key={item.productId} className="rounded-xl bg-muted/30 border border-border/40 p-3 flex items-start gap-3">
                          <div className="relative w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/60">
                            {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="48px" /> : <div className="flex h-full items-center justify-center"><Package className="h-5 w-5 text-muted-foreground/50" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link href={`/store/${item.slug}`} className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1">{item.name}</Link>
                            <p className="text-[11px] text-muted-foreground">Adet: {item.quantity}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-primary">{item.totalPrice.toFixed(2)} TL</p>
                            {item.quantity > 1 && <p className="text-[10px] text-muted-foreground">{item.unitPrice.toFixed(2)} TL/adet</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <motion.div variants={itemAnim} className="lg:sticky lg:top-24 space-y-5">
              <Card className="border-2 border-border/60 bg-card/50 backdrop-blur-sm">
                <div className="p-5 space-y-4">
                  <h2 className="text-sm font-semibold">Sipariş Toplamı</h2>
                  <div className="space-y-2.5 text-sm">
                    {subtotal3D > 0 && <div className="flex justify-between"><span className="text-muted-foreground">3D Baskı</span><span className="font-medium">{subtotal3D.toFixed(2)} TL</span></div>}
                    {subtotalStore > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Mağaza</span><span className="font-medium">{subtotalStore.toFixed(2)} TL</span></div>}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kargo</span>
                      {computedShipping > 0 ? <span className="font-medium">{computedShipping.toFixed(2)} TL</span> : <span className="text-green-600 font-medium">Ücretsiz</span>}
                    </div>
                    {couponState.coupon && (couponState.coupon.freeShipping || discount > 0) && (
                      <div className="flex justify-between text-green-600">
                        <span className="font-medium truncate pr-2">Kupon ({couponState.coupon.code})</span>
                        <span className="font-semibold shrink-0">
                          {couponState.coupon.freeShipping ? 'Ücretsiz kargo' : `-${discount.toFixed(2)} TL`}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-border/50 pt-2.5 space-y-2.5">
                      <div className="flex justify-between"><span className="text-muted-foreground">Ara Toplam</span><span className="font-medium">{summarySubtotal.toFixed(2)} TL</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">KDV (%{(vatRate * 100).toFixed(0)})</span><span className="font-medium">{vat.toFixed(2)} TL</span></div>
                    </div>
                    <div className="border-t border-border/50 pt-2.5 flex justify-between items-baseline">
                      <span className="font-semibold">Toplam</span>
                      <span className="text-2xl font-bold text-primary">{total.toFixed(2)} TL</span>
                    </div>
                  </div>

                  <CouponInput
                    coupon={couponState.coupon}
                    isChecking={couponState.isChecking}
                    error={couponState.error}
                    removedNotice={couponState.removedNotice}
                    onApply={couponState.apply}
                    onRemove={couponState.remove}
                    disabled={!hasServiceItems && !hasStoreItems}
                  />

                  <div className="grid grid-cols-3 gap-2 py-1">
                    {[
                      { icon: Truck, text: computedShipping > 0 ? `${computedShipping.toFixed(2)} TL` : 'Ücretsiz Kargo' },
                      { icon: ShieldCheck, text: 'Güvenli Ödeme' },
                      { icon: RefreshCw, text: '14 Gün İade' },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="text-center">
                        <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="text-[10px] text-muted-foreground leading-tight">{text}</p>
                      </div>
                    ))}
                  </div>

                  {hasServiceItems && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2.5">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      {isCalculatingDelivery ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Hesaplanıyor...</> : <>Tahmini teslimat: {estimatedDays} gün</>}
                    </div>
                  )}

                  {priceChange && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {priceChange.kind === 'coupon' ? 'Kupon kaldırıldı' : 'Sepet fiyatları güncellendi'}
                      </p>
                      <p>
                        {priceChange.message && <>{priceChange.message}. </>}
                        Yeni toplam{' '}
                        <span className="font-semibold">{priceChange.total.toFixed(2)} TL</span>
                        {priceChange.previousTotal !== priceChange.total && (
                          <> (önceki {priceChange.previousTotal.toFixed(2)} TL)</>
                        )}{' '}
                        — kontrol edip siparişi tekrar onaylayın.
                      </p>
                    </div>
                  )}

                  {quoteError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{quoteError}</p>
                    </div>
                  )}

                  <Button onClick={handlePlaceOrder}
                    disabled={isSubmitting || couponState.isChecking || !!quoteError || (!hasServiceItems && !hasStoreItems) || enabledGateways.length === 0 || !paymentMethod}
                    size="lg" className="w-full h-12 gap-2 rounded-xl shadow-lg shadow-primary/20"
                  >
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />İşleniyor...</> : <><CheckCircle2 className="h-5 w-5" />Siparişi Tamamla</>}
                  </Button>

                  <p className="text-[11px] text-center text-muted-foreground">
                    Siparişi tamamlayarak{' '}
                    <Link href="/mesafeli-satis-sozlesmesi" className="underline hover:text-primary">Mesafeli Satış Sözleşmesi</Link>&rsquo;ni kabul etmiş olursunuz
                  </p>
                </div>
              </Card>

              <Card className="border-2 border-primary/20 bg-primary/[0.03]">
                <div className="p-4 flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0"><CheckCircle2 className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h4 className="text-sm font-semibold mb-0.5">Güvenli Ödeme</h4>
                    <p className="text-xs text-muted-foreground">Tüm ödemeleriniz SSL ile şifrelenir ve güvenli şekilde işlenir</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>

        {selectedItem && (
          <Dialog3DViewer open={viewerOpen} onOpenChange={setViewerOpen} modelUrl={modelUrl}
            fileName={selectedItem.fileName} color={selectedItem.color} materialName={selectedItem.materialName}
            printSettingName={selectedItem.printSettingName} specifications={fileSpecs}
            slice={{
              fileId: selectedItem.fileId,
              materialId: selectedItem.materialId,
              printSettingId: selectedItem.printSettingId,
              nozzleSizeMm: selectedItem.nozzleSizeMm ?? null,
              supportEnabled: selectedItem.supportEnabled !== false,
              customLayerHeight: selectedItem.customLayerHeight ?? null,
              customInfill: selectedItem.customInfillPercentage ?? null,
              // Sepette süre çarpanı saklanır; önizleme API'si hız çarpanı bekler.
              customSpeed: selectedItem.customTimeMultiplier
                ? 1 / selectedItem.customTimeMultiplier
                : null,
              technology: selectedItem.technology ?? null,
            }} />
        )}

        <div className="h-4" />
      </motion.div>
    </DashboardShell>
  );
}
