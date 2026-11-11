'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Package, ShoppingCart, Minus, Plus, ArrowLeft, CheckCircle2,
  Truck, ShieldCheck, RefreshCw, Star, Store, ChevronRight,
  Check, Eye, MapPin, CreditCard, Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { LoginDialog } from '@/components/auth/LoginDialog';
import type { StoreProduct, StoreProductImage, PaginatedResult } from '@/lib/services/store-service';
import { getStoreItems, saveStoreItems } from '@/lib/cart/store-cart';
import type { StoreItem } from '@/lib/cart/store-cart';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const IMG_BASE = '/images';

export default function StoreProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [related, setRelated] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [added, setAdded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [freeShippingMin, setFreeShippingMin] = useState(500);
  const { user } = useAuth();
  const slug = params.slug as string;
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/store/products/${slug}`);
        if (res.status === 404) { router.push('/store'); return; }
        if (!res.ok) throw new Error();
        const data: StoreProduct = await res.json();
        setProduct(data);
        const cs = data.category?.slug;
        const p = new URLSearchParams({ per_page: '4', sort: 'newest' });
        if (cs) p.set('category_slug', cs);
        const rr = await fetch(`/api/store/products?${p}`);
        if (rr.ok) {
          const rd: PaginatedResult<StoreProduct> = await rr.json();
          setRelated(rd.data.filter(x => x.id !== data.id).slice(0, 4));
        }
      } catch { toast.error('Ürün yüklenemedi'); }
      finally { setLoading(false); }
    })();
    (async () => {
      try {
        const sr = await fetch('/api/admin/shipping-settings');
        if (sr.ok) {
          const sd = await sr.json();
          if (sd.settings?.freeShippingMinAmount) setFreeShippingMin(sd.settings.freeShippingMinAmount);
        }
      } catch { /* ignore */ }
    })();
  }, [slug, router]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-pulse" />
            <div className="absolute inset-2 rounded-xl bg-primary/10 animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground/60">Yükleniyor</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-[20px] bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <Package className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Ürün bulunamadı</h2>
          <p className="text-sm text-muted-foreground mb-6">Bu ürün kaldırılmış veya mevcut değil.</p>
          <Button asChild className="h-11 px-6 rounded-xl"><Link href="/store">Mağazaya Dön</Link></Button>
        </div>
      </div>
    );
  }

  const imgs: StoreProductImage[] = (product.images || []).filter(i => i.image_url !== product.main_image_url);
  if (product.main_image_url) {
    imgs.unshift({ id: 'main', product_id: product.id, image_url: product.main_image_url, alt_text: product.name, sort_order: 0, is_main: true });
  }
  const activeImg = imgs[imgIdx]?.image_url || product.main_image_url;
  const oos = product.track_stock && product.stock_quantity <= 0 && !product.allow_backorder;
  const lowStock = product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5;
  const pct = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100) : null;

  const add = () => {
    if (oos) { toast.error('Stokta yok'); return; }
    if (product.track_stock && !product.allow_backorder && qty > (product.stock_quantity || 0)) { toast.error('Yetersiz stok'); return; }
    const c = getStoreItems();
    const i = c.findIndex((x: StoreItem) => x.productId === product.id);
    if (i >= 0) { c[i].quantity += qty; c[i].totalPrice = c[i].unitPrice * c[i].quantity; }
    else c.push({ productId: product.id, name: product.name, slug: product.slug, imageUrl: product.main_image_url, unitPrice: product.price, quantity: qty, totalPrice: product.price * qty });
    saveStoreItems(c);
    setAdded(true);
    toast.success('Sepete eklendi', { icon: <ShoppingCart className="h-4 w-4" /> });
    window.dispatchEvent(new Event('cart-update'));
    setTimeout(() => setAdded(false), 1500);
  };

  const maxQty = product.track_stock && !product.allow_backorder ? (product.stock_quantity || 999) : 999;

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb + Back */}
      <div className="border-b border-border/30 bg-[#fafafa] dark:bg-[#111]">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/store"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mağazaya Dön</span>
            </Link>
            <span className="text-muted-foreground/20 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 min-w-0 overflow-hidden">
              <Link href="/" className="hover:text-foreground transition-colors shrink-0">Ana Sayfa</Link>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <Link href="/store" className="hover:text-foreground transition-colors shrink-0">Mağaza</Link>
              {product.category && (
                <><ChevronRight className="h-3 w-3 shrink-0" /><Link href={`/store?category_slug=${product.category.slug}`} className="hover:text-foreground transition-colors truncate">{product.category.name}</Link></>
              )}
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-foreground/70 truncate">{product.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCT */}
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">

          {/* LEFT — Image */}
          <div className="space-y-3 lg:sticky lg:top-28 lg:self-start">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              ref={imgRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => setZoomed(false)}
              className={cn(
                'relative aspect-square rounded-2xl overflow-hidden bg-[#f5f5f5] dark:bg-[#1a1a1a] cursor-crosshair border border-border/20',
                zoomed && 'shadow-2xl'
              )}
            >
              {activeImg ? (
                <Image
                  src={activeImg}
                  alt={imgs[imgIdx]?.alt_text || product.name}
                  fill
                  className={cn(
                    'object-cover transition-all duration-700 ease-out',
                    zoomed ? 'scale-150' : 'scale-100'
                  )}
                  style={zoomed ? { objectPosition: `${mousePos.x}% ${mousePos.y}%` } : undefined}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-32 w-32 text-muted-foreground/10" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                {pct && <div className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-[11px] font-bold shadow-lg">-%{pct} İndirim</div>}
                {product.is_featured && <div className="px-2.5 py-1 rounded-lg bg-amber-500/90 text-white text-[11px] font-bold shadow-lg backdrop-blur-sm">Öne Çıkan</div>}
              </div>

              {/* Zoom hint */}
              <div className={cn('absolute bottom-3 right-3 w-8 h-8 rounded-xl bg-white/80 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300', zoomed ? 'opacity-0' : 'opacity-100')}>
                <Maximize2 className="h-4 w-4 text-muted-foreground/70" />
              </div>
            </motion.div>

            {/* Thumbnails */}
            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {imgs.map((img, i) => (
                  <button key={img.id || i} onClick={() => setImgIdx(i)}
                    className={cn(
                      'w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200',
                      i === imgIdx ? 'border-primary ring-2 ring-primary/15' : 'border-border/30 hover:border-muted-foreground/40'
                    )}
                  >
                    <Image src={img.image_url} alt={product.name} width={72} height={72} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Info */}
          <div className="flex flex-col gap-6 lg:pt-2">
            {/* Header */}
            <div>
              {product.category && (
                <Link href={`/store?category_slug=${product.category.slug}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary/60 uppercase tracking-[0.08em] hover:text-primary transition-colors mb-2">
                  <Store className="h-3 w-3" /> {product.category.name}
                </Link>
              )}
              <h1 className="text-[28px] lg:text-4xl font-bold tracking-tight leading-tight">{product.name}</h1>
              {product.short_description && (
                <p className="text-sm text-muted-foreground/70 mt-2 leading-relaxed max-w-xl">{product.short_description}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-[34px] lg:text-[42px] font-bold tracking-tight">
                <span className="gradient-text">{product.price.toFixed(2)}</span>
                <span className="text-2xl lg:text-3xl text-muted-foreground/40 ml-0.5">TL</span>
              </span>
              {pct && (
                <span className="text-lg text-muted-foreground/40 line-through">{product.compare_at_price!.toFixed(2)} TL</span>
              )}
            </div>

            {/* Divider */}
            <Separator className="bg-border/30" />

            {/* Stock */}
            <div className="flex items-center gap-3 flex-wrap">
              {!oos && !lowStock && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-lg border border-green-200/50 dark:border-green-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Stokta
                </span>
              )}
              {lowStock && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Son {product.stock_quantity} ürün
                </span>
              )}
              {oos && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-200/50 dark:border-red-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Stokta yok
                </span>
              )}
              {product.allow_backorder && (
                <span className="text-xs text-muted-foreground/60 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/20">Siparişe açık</span>
              )}
              {product.sku && (
                <span className="text-[11px] text-muted-foreground/40 ml-auto">SKU: {product.sku}</span>
              )}
            </div>

            <Separator className="bg-border/30" />

            {/* Quantity + Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border/30 rounded-xl overflow-hidden bg-background shadow-sm">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}
                    className="h-12 w-12 flex items-center justify-center text-muted-foreground/60 hover:bg-muted/40 transition-colors disabled:opacity-20 disabled:cursor-default">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input type="number" value={qty}
                    onChange={e => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, maxQty)))}
                    className="w-14 text-center border-0 h-12 text-sm font-medium bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  <button onClick={() => setQty(Math.min(qty + 1, maxQty))}
                    className="h-12 w-12 flex items-center justify-center text-muted-foreground/60 hover:bg-muted/40 transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground/60">
                  Toplam: <strong className="text-foreground">{(product.price * qty).toFixed(2)} TL</strong>
                </span>
              </div>

              <div className="flex gap-2.5">
                <Button
                  size="lg"
                  disabled={oos}
                  onClick={() => { if (!user) setShowLogin(true); else add(); }}
                  className={cn(
                    'flex-1 h-14 text-base rounded-2xl font-semibold transition-all duration-300',
                    added ? 'bg-green-600 hover:bg-green-600 shadow-lg shadow-green-600/20' : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
                  )}
                >
                  <AnimatePresence mode="wait">
                    {added ? (
                      <motion.span key="added" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="flex items-center gap-2">
                        <Check className="h-5 w-5" /> Sepete Eklendi
                      </motion.span>
                    ) : oos ? (
                      <span>Stokta Yok</span>
                    ) : (
                      <motion.span key="add" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" /> Sepete Ekle
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </div>

            <Separator className="bg-border/30" />

            {/* Trust */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { icon: Truck, title: 'Kargo', desc: `${freeShippingMin} TL üzeri ücretsiz`, sub: '2-5 iş günü' },
                { icon: ShieldCheck, title: 'Ödeme', desc: 'iyzico güvencesi', sub: '256-bit SSL' },
                { icon: RefreshCw, title: 'İade', desc: '14 gün içinde', sub: 'Ücretsiz iade' },
              ].map(x => (
                <div key={x.title} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/40 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/5"><x.icon className="h-4 w-4 text-primary/70" /></div>
                  <div><p className="text-xs font-medium">{x.desc}</p><p className="text-[10px] text-muted-foreground/50">{x.sub}</p></div>
                </div>
              ))}
            </div>

            {/* Shipping note */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/50 bg-muted/20 rounded-xl px-4 py-3 border border-border/15">
              <MapPin className="h-3.5 w-3.5 text-primary/50" />
              <span>Türkiye geneli kargo ile teslimat</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <section className="border-t border-border/20 bg-[#fafafa] dark:bg-[#111]">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:py-16">
          <DetailTabs product={product} />
        </div>
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold">Benzer Ürünler</h2>
              <p className="text-sm text-muted-foreground/60 mt-0.5">Bunlar da ilginizi çekebilir</p>
            </div>
            <Link href="/store" className="text-sm font-medium text-primary hover:underline underline-offset-2">Tümünü Gör →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            {related.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/store/${p.slug}`} className="group block">
                  <div className="rounded-xl lg:rounded-2xl border border-border/20 bg-card overflow-hidden hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                    <div className="aspect-square bg-[#f5f5f5] dark:bg-[#1a1a1a] overflow-hidden relative">
                      {p.main_image_url ? (
                        <Image src={p.main_image_url} alt={p.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/15" /></div>
                      )}
                      {p.compare_at_price && p.compare_at_price > p.price && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-bold shadow">-{Math.round((1 - p.price / p.compare_at_price) * 100)}%</div>
                      )}
                    </div>
                    <div className="p-3 lg:p-4 space-y-1">
                      <p className="text-xs lg:text-sm font-medium truncate group-hover:text-primary transition-colors">{p.name}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm lg:text-base font-bold text-primary">{p.price.toFixed(2)} TL</span>
                        {p.compare_at_price && p.compare_at_price > p.price && (
                          <span className="text-[10px] lg:text-xs text-muted-foreground/40 line-through">{p.compare_at_price.toFixed(2)} TL</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Conversion sections */}
      <section className="border-t border-border/20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:py-16">
          <div className="max-w-5xl mx-auto space-y-10">
            {/* Why AXIS3 */}
            <div>
              <h3 className="text-lg font-bold text-center mb-6">Neden AXIS3?</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: ShieldCheck, title: 'Kalite Garantisi', desc: 'Tüm baskılar sıkı kalite kontrolünden geçer, sorunsuz teslim edilir.' },
                  { icon: Truck, title: 'Hızlı Kargo', desc: `${freeShippingMin} TL üzeri ücretsiz kargo, 2-5 iş günü içinde kapınızda.` },
                  { icon: RefreshCw, title: 'Kolay İade', desc: '14 gün içinde ücretsiz iade, üretim hatasında yeniden baskı.' },
                ].map(x => (
                  <div key={x.title} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/20">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0"><x.icon className="h-5 w-5 text-primary" /></div>
                    <div><p className="text-sm font-semibold mb-0.5">{x.title}</p><p className="text-xs text-muted-foreground/70 leading-relaxed">{x.desc}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: '25.000+', label: 'Başarılı Baskı' },
                { value: '3.500+', label: 'Mutlu Müşteri' },
                { value: '9+', label: 'Malzeme' },
                { value: '%99', label: 'Memnuniyet' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-xl bg-card border border-border/20">
                  <p className="text-2xl font-extrabold gradient-text">{s.value}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Mini CTA */}
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
              <p className="text-sm font-semibold mb-1">Bu ürünü beğendiniz mi?</p>
              <p className="text-xs text-muted-foreground/70 mb-3">Hemen sepete ekleyin, profesyonel 3D baskı kalitesini keşfedin.</p>
              <Button size="sm" className="rounded-xl gap-1.5" onClick={() => { if (!user) setShowLogin(true); else add(); }}>
                <ShoppingCart className="h-4 w-4" /> Sepete Ekle
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/95 backdrop-blur-lg border-t border-border/20 px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground/60 truncate">{product.name}</p>
            <p className="text-lg font-bold"><span className="gradient-text">{product.price.toFixed(2)} TL</span></p>
          </div>
          <div className="flex items-center border border-border/30 rounded-xl overflow-hidden bg-background shadow-sm flex-shrink-0">
            <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}
              className="h-10 w-10 flex items-center justify-center text-muted-foreground/60 hover:bg-muted/40 transition-colors disabled:opacity-20 disabled:cursor-default">
              <Minus className="h-3 w-3" />
            </button>
            <input type="number" value={qty}
              onChange={e => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, maxQty)))}
              className="w-10 text-center border-0 h-10 text-sm font-medium bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            <button onClick={() => setQty(Math.min(qty + 1, maxQty))}
              className="h-10 w-10 flex items-center justify-center text-muted-foreground/60 hover:bg-muted/40 transition-colors">
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <Button size="sm" disabled={oos}
            onClick={() => { if (!user) setShowLogin(true); else add(); }}
            className={cn('h-10 rounded-xl px-5 gap-1.5 text-sm flex-shrink-0', added ? 'bg-green-600' : '')}>
            {added ? <><Check className="h-4 w-4" /> Eklendi</> : <><ShoppingCart className="h-4 w-4" /> Ekle</>}
          </Button>
        </div>
      </div>

      {/* bottom spacer for mobile sticky */}
      <div className="h-[72px] lg:hidden" />

      <LoginDialog open={showLogin} onOpenChange={setShowLogin} onSuccess={add} />
    </div>
  );
}

function DetailTabs({ product }: { product: StoreProduct }) {
  const [tab, setTab] = useState<'desc' | 'specs'>('desc');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex gap-0 border-b border-border/20 mb-8">
        <button onClick={() => setTab('desc')}
          className={cn('px-5 py-3 text-sm font-medium transition-colors relative', tab === 'desc' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-foreground/70')}>
          Açıklama
          {tab === 'desc' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button onClick={() => setTab('specs')}
          className={cn('px-5 py-3 text-sm font-medium transition-colors relative', tab === 'specs' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-foreground/70')}>
          Özellikler
          {tab === 'specs' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'desc' ? (
          <motion.div key="desc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground/80 leading-relaxed">
              {product.description ? (
                <div className="space-y-4 [&_p]:leading-relaxed">{product.description.split('\n').filter(l => l.trim()).map((l, i) => <p key={i}>{l}</p>)}</div>
              ) : (
                <p className="text-muted-foreground/40 text-center py-10">Henüz açıklama eklenmemiş.</p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="specs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                ['Stok Kodu', product.sku || '—'],
                ['Fiyat', `${product.price.toFixed(2)} TL`],
                ['Stok', oos(product) ? 'Stokta yok' : 'Stokta'],
                ['Ağırlık', product.weight_grams ? `${product.weight_grams}g` : '—'],
                ['Kategori', product.category?.name || 'Genel'],
                ['Birim', product.unit || 'Adet'],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/20 border border-border/10">
                  <span className="text-xs text-muted-foreground/60">{l}</span>
                  <span className="text-xs font-medium">{v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function oos(p: StoreProduct) {
  return p.track_stock && p.stock_quantity <= 0 && !p.allow_backorder;
}
