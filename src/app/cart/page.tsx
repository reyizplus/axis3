'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, Clock, AlertCircle, Palette, Store, Printer, Truck, Gift, Loader2, Sparkles, ShoppingBag,
} from 'lucide-react';
import { cartService, type CartItem } from '@/lib/cart/cart-service';
import { getStoreItems, saveStoreItems, type StoreItem } from '@/lib/cart/store-cart';
import { toast } from 'sonner';
import Link from 'next/link';
import { calculateCartDeliveryDays } from '@/lib/utils/delivery-calculator';
import { getVatRate, getShippingSettings } from '@/lib/services/settings-service';
import { createClient } from '@/lib/supabase/client';
import { calculateOrderTotals } from '@/lib/services/order-totals';
import { useCoupon } from '@/lib/cart/use-coupon';
import { CouponInput } from '@/components/checkout/coupon-input';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const itemAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

function CartContent() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estimatedDays, setEstimatedDays] = useState(0);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [vatRate, setVatRate] = useState(0.20);
  const [shippingFee, setShippingFee] = useState(0);
  const [freeShippingMinAmount, setFreeShippingMinAmount] = useState(0);

  const loadCart = useCallback(async () => {
    try {
      const supabase = createClient();
      let items = cartService.getItems();
      // Check file existence for 3D print items
      if (items.length > 0) {
        const fileIds = items.map(i => i.fileId).filter(Boolean);
        if (fileIds.length > 0) {
          const { data: files } = await supabase
            .from('files')
            .select('id')
            .is('deleted_at', null)
            .in('id', fileIds);
          const activeFileIds = new Set((files || []).map((f: any) => f.id));
          const removed = items.filter(i => i.fileId && !activeFileIds.has(i.fileId));
          for (const item of removed) {
            toast.error(`"${item.fileName}" artık mevcut değil`);
            await cartService.removeItem(item.id);
          }
          items = items.filter(i => !i.fileId || activeFileIds.has(i.fileId));
        }
      }
      setCartItems(items);
      const storedStoreItems = getStoreItems();
      if (storedStoreItems.length > 0) {
        const productIds = storedStoreItems.map(i => i.productId);
        const { data: products } = await (supabase.from('store_products') as any)
          .select('id, price, stock_quantity, track_stock, allow_backorder, is_active').in('id', productIds);
        const productMap: Record<string, any> = {};
        if (products) for (const p of products) productMap[(p as any).id] = p;
        let storePricesChanged = false;
        const verified = storedStoreItems.flatMap(item => {
          const db = productMap[item.productId];
          if (!db || !db.is_active) { toast.error(`"${item.name}" artık mevcut değil`); storePricesChanged = true; return []; }
          if (db.track_stock && !db.allow_backorder && db.stock_quantity < item.quantity)
            toast.error(`"${item.name}" için yeterli stok yok (kalan: ${db.stock_quantity})`);
          // Fiyat sunucuda ürün tablosundan okunur; sepet eski fiyatı gösterirse
          // sipariş "Fiyatlar güncellendi" (409) ile reddedilir. Sepeti burada
          // DB fiyatıyla eşitleyip müşteriye doğru tutarı gösteriyoruz.
          const unitPrice = Number(db.price);
          if (Number.isFinite(unitPrice) && unitPrice !== item.unitPrice) {
            toast.error(`"${item.name}" fiyatı güncellendi`);
            storePricesChanged = true;
            return [{ ...item, unitPrice, totalPrice: unitPrice * item.quantity }];
          }
          return [item];
        });
        setStoreItems(verified);
        if (storePricesChanged) saveStoreItems(verified);
      } else { setStoreItems(storedStoreItems); }
      if (items.length > 0) { setIsCalculatingDelivery(true); const d = await calculateCartDeliveryDays(items); setEstimatedDays(d); }
      setVatRate(await getVatRate());
      const shipSettings = await getShippingSettings();
      setShippingFee(shipSettings.shippingFee);
      setFreeShippingMinAmount(shipSettings.freeShippingMinAmount);

      // 3D kalemlerin birim fiyatı adede bağlı (adet indirimi + satır başına
      // bir kez alınan servis/hazırlık giderleri). Sepette `birim × adet`
      // gösterip siparişte 409 yemek yerine fiyatları sunucudan tazele.
      // Beklemeyi engellememek için arka planda çalışır.
      if (items.length > 0) {
        void cartService.repriceCart().then((priced) => {
          if (priced.length > 0) setCartItems(priced);
        });
      }
    } catch { toast.error('Sepet yüklenemedi'); }
    finally { setIsLoading(false); setIsCalculatingDelivery(false); }
  }, []);

  useEffect(() => {
    loadCart();
    const h = () => loadCart();
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.includes('axis3_cart_') || e.key === 'axis3_cart_store') {
        loadCart();
      }
    };
    window.addEventListener('store-cart-updated', h);
    window.addEventListener('cart-updated', h);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('store-cart-updated', h);
      window.removeEventListener('cart-updated', h);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadCart]);

  const handleServiceQuantity = async (itemId: string, q: number) => {
    if (q < 1) return;
    try { await cartService.updateQuantity(itemId, q); loadCart(); } catch { toast.error('Adet güncellenemedi'); }
  };

  const handleServiceRemove = async (itemId: string) => {
    try { await cartService.removeItem(itemId); loadCart(); toast.success('Ürün sepetten kaldırıldı'); } catch { toast.error('Ürün kaldırılamadı'); }
  };

  const handleStoreQuantity = (productId: string, delta: number) => {
    const updated = storeItems.map(item => item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta), totalPrice: item.unitPrice * Math.max(1, item.quantity + delta) } : item);
    setStoreItems(updated); saveStoreItems(updated);
  };

  const handleStoreRemove = (productId: string) => { const updated = storeItems.filter(i => i.productId !== productId); setStoreItems(updated); saveStoreItems(updated); toast.success('Ürün sepetten kaldırıldı'); };

  const handleClearAll = async () => { await cartService.clearCart(); saveStoreItems([]); loadCart(); toast.success('Sepet temizlendi'); };

  const subtotal3D = cartItems.reduce((s, i) => s + i.totalPrice, 0);
  const subtotalStore = storeItems.reduce((s, i) => s + i.totalPrice, 0);
  const subtotalItems = subtotal3D + subtotalStore;

  // Shared with checkout: the server validates the code against these totals
  // and re-runs silently whenever the cart changes.
  const couponState = useCoupon({
    itemsSubtotal: subtotalItems,
    serviceSubtotal: subtotal3D,
    storeSubtotal: subtotalStore,
  });

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

  const remainingForFreeShipping = shippingFee > 0 && computedShipping > 0 ? freeShippingMinAmount - subtotal : 0;
  // "Ara Toplam" indirimli ürünler + kargo; KDV bu tutar üzerinden bir kez eklenir.
  const summarySubtotal = subtotal - discount + computedShipping;
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0) + storeItems.reduce((s, i) => s + i.quantity, 0);
  const hasItems = cartItems.length > 0 || storeItems.length > 0;

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-8">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" />
            </div>
            <Skeleton className="h-96 rounded-2xl" />
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
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                  <ShoppingBag className="h-3 w-3 text-primary" />
                  Sepetim
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sepetim</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasItems
                  ? `${totalItems} ürün — ${subtotal3D > 0 && subtotalStore > 0 ? '3D Baskı + Mağaza' : subtotal3D > 0 ? '3D Baskı Hizmeti' : 'Mağaza Ürünleri'}`
                  : 'Sepetinizdeki ürünleri görüntüleyin'}
              </p>
            </div>
            {hasItems ? (
              <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4" /> Sepeti Temizle
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl">
                <Link href="/store"><Store className="h-4 w-4" />Mağazaya Git</Link>
              </Button>
            )}
          </div>
        </motion.div>

        {!hasItems ? (
          <motion.div variants={itemAnim}>
            <Card className="relative overflow-hidden border-2 border-dashed border-border/60 bg-card/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_70%)]" />
              <CardContent className="relative flex flex-col items-center justify-center py-20">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                    <ShoppingCart className="h-9 w-9 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Sepetiniz Boş</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">3D model yükleyebilir veya mağazadan ürün ekleyebilirsiniz.</p>
                <div className="flex gap-3">
                  <Button asChild size="lg" className="gap-2 rounded-xl shadow-lg shadow-primary/20"><Link href="/upload"><Package className="h-5 w-5" />Model Yükle</Link></Button>
                  <Button asChild size="lg" variant="outline" className="gap-2 rounded-xl"><Link href="/store"><Store className="h-5 w-5" />Mağazaya Git</Link></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* 3D Hizmet */}
              {cartItems.length > 0 && (
                <motion.div variants={itemAnim}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Printer className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold">3D Baskı Hizmeti</h2>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cartItems.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {cartItems.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="group relative rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div>
                              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{item.fileName}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.materialName}</Badge>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.printSettingName}</Badge>
                                {item.color && <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1"><Palette className="h-2.5 w-2.5" />{item.color}</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Package className="h-3 w-3" />{item.volumeCm3?.toFixed(2)} cm³</span>
                            </div>
                            {item.isPreorder && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0">
                                Ön Sipariş{item.preorderDiscountPercent != null && ` (%${item.preorderDiscountPercent} indirim)`}
                              </Badge>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-xs text-muted-foreground">Adet:</span>
                              <div className="flex items-center gap-0.5">
                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleServiceQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleServiceQuantity(item.id, item.quantity + 1)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <p className="text-xs text-muted-foreground">Birim: {item.unitPrice.toFixed(2)} TL</p>
                            <p className="text-lg font-bold text-primary">{item.totalPrice.toFixed(2)} TL</p>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => handleServiceRemove(item.id)}>
                              <Trash2 className="h-3 w-3 mr-1" />Kaldır
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Mağaza Ürünleri */}
              {storeItems.length > 0 && (
                <motion.div variants={itemAnim}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold">Mağaza Ürünleri</h2>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{storeItems.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {storeItems.map((item, idx) => (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="group relative rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          <Link href={`/store/${item.slug}`} className="relative w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/60">
                            {item.imageUrl ? (
                              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                            ) : (
                              <div className="flex h-full items-center justify-center"><Package className="h-6 w-6 text-muted-foreground/50" /></div>
                            )}
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/store/${item.slug}`} className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1">{item.name}</Link>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.unitPrice.toFixed(2)} TL / adet</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">Adet:</span>
                              <div className="flex items-center gap-0.5">
                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleStoreQuantity(item.productId, -1)} disabled={item.quantity <= 1}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleStoreQuantity(item.productId, 1)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <p className="text-lg font-bold text-primary">{item.totalPrice.toFixed(2)} TL</p>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => handleStoreRemove(item.productId)}>
                              <Trash2 className="h-3 w-3 mr-1" />Kaldır
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Summary */}
            <div className="lg:col-span-1">
              <motion.div variants={itemAnim} className="lg:sticky lg:top-24 space-y-5">
                {/* Shipping progress */}
                {shippingFee > 0 && (
                  <Card className="border-2 border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardContent className="p-0">
                      {computedShipping > 0 ? (
                        <div className="p-5 space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Truck className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">
                              {remainingForFreeShipping > 0
                                ? `${remainingForFreeShipping.toFixed(2)} TL daha ekleyin, kargo ücretsiz!`
                                : 'Kargo ücretsiz!'}
                            </span>
                          </div>
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-500" style={{ width: `${Math.min((subtotal / freeShippingMinAmount) * 100, 100)}%` }} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">{freeShippingMinAmount.toFixed(2)} TL üzeri ücretsiz kargo</p>
                        </div>
                      ) : (
                        <div className="p-5 flex items-center gap-2 text-sm">
                          <Gift className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="font-medium text-green-600">Kargo ücretsiz!</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Order summary */}
                <Card className="border-2 border-border/60 bg-card/50 backdrop-blur-sm">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">Sipariş Özeti</h2>
                      <span className="text-xs text-muted-foreground">{totalItems} ürün</span>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      {subtotal3D > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">3D Baskı</span>
                          <span className="font-medium">{subtotal3D.toFixed(2)} TL</span>
                        </div>
                      )}
                      {subtotalStore > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mağaza</span>
                          <span className="font-medium">{subtotalStore.toFixed(2)} TL</span>
                        </div>
                      )}
                      {shippingFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Kargo</span>
                          {computedShipping > 0 ? (
                            <span className="font-medium">{computedShipping.toFixed(2)} TL</span>
                          ) : (
                            <span className="text-green-600 font-medium">Ücretsiz</span>
                          )}
                        </div>
                      )}
                      {couponState.coupon && (couponState.coupon.freeShipping || discount > 0) && (
                        <div className="flex justify-between text-green-600">
                          <span className="font-medium truncate pr-2">
                            Kupon ({couponState.coupon.code})
                          </span>
                          <span className="font-semibold shrink-0">
                            {couponState.coupon.freeShipping ? 'Ücretsiz kargo' : `-${discount.toFixed(2)} TL`}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-border/50 pt-2.5 space-y-2.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ara Toplam</span>
                          <span className="font-medium">{summarySubtotal.toFixed(2)} TL</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">KDV (%{(vatRate * 100).toFixed(0)})</span>
                          <span className="font-medium">{vat.toFixed(2)} TL</span>
                        </div>
                      </div>
                      <div className="border-t border-border/50 pt-2.5 flex justify-between text-base font-bold">
                        <span>Toplam</span>
                        <span className="text-primary">{total.toFixed(2)} TL</span>
                      </div>
                    </div>

                    <CouponInput
                      coupon={couponState.coupon}
                      isChecking={couponState.isChecking}
                      error={couponState.error}
                      removedNotice={couponState.removedNotice}
                      onApply={couponState.apply}
                      onRemove={couponState.remove}
                      disabled={!hasItems}
                    />

                    {cartItems.length > 0 && (
                      <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Clock className="h-3.5 w-3.5 text-primary" /> Tahmini Teslimat
                        </div>
                        <p className="text-xs text-muted-foreground pl-5.5">
                          {isCalculatingDelivery
                            ? <><Loader2 className="inline h-3 w-3 animate-spin mr-1" />Hesaplanıyor...</>
                            : <>{estimatedDays} iş günü</>
                          }
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/15 p-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-600">Siparişiniz tek bir sevkiyat ile teslim edilecektir.</p>
                    </div>

                    <Button size="lg" className="w-full h-12 gap-2 rounded-xl shadow-lg shadow-primary/20" onClick={() => router.push('/checkout')}>
                      Ödemeye Geç <ArrowRight className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" className="w-full h-10 rounded-xl text-xs gap-1.5" asChild>
                      <Link href={cartItems.length > 0 ? '/upload' : '/store'}>
                        {cartItems.length > 0 ? <>Yeni Model Yükle <Sparkles className="h-3.5 w-3.5" /></> : <>Mağazaya Dön <Store className="h-3.5 w-3.5" /></>}
                      </Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        )}

        <div className="h-4" />
      </motion.div>
    </DashboardShell>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <DashboardShell>
        <div className="space-y-8"><Skeleton className="h-28 rounded-2xl" /><div className="flex items-center justify-center py-10"><p className="text-sm text-muted-foreground">Sepet yükleniyor...</p></div></div>
      </DashboardShell>
    }>
      <CartContent />
    </Suspense>
  );
}
