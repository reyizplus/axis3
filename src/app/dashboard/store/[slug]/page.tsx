'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { getStoreItems, saveStoreItems, type StoreItem } from '@/lib/cart/store-cart';
import type { StoreProduct, StoreProductImage, PaginatedResult } from '@/lib/services/store-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Loader2, Package, ShoppingCart, ArrowLeft, Minus, Plus, Check, Tag, Truck,
  ShieldCheck, RefreshCw, Store, ChevronRight, MapPin, Maximize2, Star, Eye, Box,
} from 'lucide-react';

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const itemAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function DashboardStoreProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [related, setRelated] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [tab, setTab] = useState<'desc' | 'specs'>('desc');
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/store/products/${slug}`);
        if (res.status === 404) { router.push('/dashboard/store'); return; }
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
      <DashboardShell>
        <div className="space-y-8 p-6 max-w-[1200px] mx-auto">
          <Skeleton className="h-6 w-72 rounded-xl" />
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6"><Skeleton className="h-8 w-3/4 rounded-xl" /><Skeleton className="h-6 w-1/3 rounded-xl" /><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!product) return null;

  const imgs: StoreProductImage[] = (product.images || []).filter(
    (i: StoreProductImage) => i.image_url !== product.main_image_url
  );
  if (product.main_image_url) {
    imgs.unshift({
      id: 'main', product_id: product.id, image_url: product.main_image_url,
      alt_text: product.name, sort_order: 0, is_main: true,
    });
  }
  const activeImg = imgs[imgIdx]?.image_url || product.main_image_url;

  const discountPercent = product?.compare_at_price && product?.compare_at_price > product?.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100) : null;

  const isOutOfStock = product?.track_stock && product?.stock_quantity <= 0 && !product?.allow_backorder;
  const lowStock = product?.track_stock && product?.stock_quantity > 0 && product?.stock_quantity <= 5;
  const maxQty = product.track_stock && !product.allow_backorder ? (product.stock_quantity || 999) : 999;

  const handleAddToCart = () => {
    if (!product) return;
    if (isOutOfStock) { toast.error('Stokta yok'); return; }
    if (product.track_stock && !product.allow_backorder && qty > (product.stock_quantity || 0)) { toast.error('Yetersiz stok'); return; }
    const current = getStoreItems();
    const existing = current.findIndex((x: StoreItem) => x.productId === product.id);
    if (existing >= 0) {
      current[existing].quantity += qty;
      current[existing].totalPrice = current[existing].unitPrice * current[existing].quantity;
    } else {
      current.push({
        productId: product.id, quantity: qty, name: product.name,
        slug: product.slug, unitPrice: product.price,
        imageUrl: product.main_image_url || '', totalPrice: product.price * qty,
      });
    }
    saveStoreItems(current);
    setAdded(true);
    toast.success(`${product.name} sepete eklendi`);
    window.dispatchEvent(new Event('cart-update'));
    setTimeout(() => setAdded(false), 1500);
  };

  const specs = [
    ['Stok Kodu', product.sku || '—'],
    ['Fiyat', `${product.price.toFixed(2)} TL`],
    ['Durum', isOutOfStock ? 'Stokta yok' : lowStock ? `Son ${product.stock_quantity}` : 'Stokta'],
    ['Ağırlık', product.weight_grams ? `${product.weight_grams}g` : '—'],
    ['Kategori', product.category?.name || 'Genel'],
    ['Birim', product.unit || 'Adet'],
  ];

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-8 p-6 max-w-[1200px] mx-auto">

        {/* Breadcrumb */}
        <motion.div variants={itemAnim} className="flex items-center gap-2 text-xs text-muted-foreground/70">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href="/dashboard/store" className="hover:text-foreground transition-colors">Mağaza</Link>
          {product.category && (
            <><ChevronRight className="h-3 w-3 shrink-0" /><span className="text-muted-foreground/50 truncate">{product.category.name}</span></>
          )}
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground/70 truncate font-medium">{product.name}</span>
        </motion.div>

        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* LEFT - Image Gallery */}
          <motion.div variants={itemAnim} className="space-y-3 lg:sticky lg:top-28 lg:self-start">
            <div
              ref={imgRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => setZoomed(false)}
              className={cn(
                'relative aspect-square rounded-2xl overflow-hidden bg-[#f5f5f5] dark:bg-[#1a1a1a] cursor-crosshair border-2',
                zoomed ? 'border-primary/30 shadow-2xl shadow-primary/10' : 'border-border/40',
              )}
            >
              {activeImg ? (
                <Image
                  src={activeImg}
                  alt={imgs[imgIdx]?.alt_text || product.name}
                  fill
                  className={cn('object-cover transition-all duration-700 ease-out', zoomed ? 'scale-150' : 'scale-100')}
                  style={zoomed ? { objectPosition: `${mousePos.x}% ${mousePos.y}%` } : undefined}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground/10" />
                </div>
              )}
              {discountPercent && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold shadow-lg z-10">
                  %{discountPercent} İndirim
                </div>
              )}
              <div className={cn(
                'absolute bottom-3 right-3 w-9 h-9 rounded-xl bg-background/70 backdrop-blur-md border border-border/30 flex items-center justify-center transition-opacity duration-300',
                zoomed ? 'opacity-0' : 'opacity-100',
              )}>
                <Maximize2 className="h-4 w-4 text-muted-foreground/70" />
              </div>
            </div>

            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {imgs.map((img, i) => (
                  <button
                    key={img.id || i}
                    onClick={() => setImgIdx(i)}
                    className={cn(
                      'relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-200',
                      i === imgIdx ? 'border-primary ring-2 ring-primary/15' : 'border-border/30 hover:border-muted-foreground/40',
                    )}
                  >
                    <Image src={img.image_url} alt={product.name} width={72} height={72} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* RIGHT - Product Info */}
          <motion.div variants={itemAnim} className="flex flex-col gap-6 lg:pt-2">
            {/* Header */}
            <div>
              {product.category && (
                <Link href="/dashboard/store" className="inline-flex items-center gap-1 text-xs font-medium text-primary/70 uppercase tracking-wider hover:text-primary transition-colors mb-2">
                  <Store className="h-3.5 w-3.5" /> {product.category.name}
                </Link>
              )}
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{product.name}</h1>
              {product.short_description && (
                <p className="text-sm text-muted-foreground/70 mt-2 leading-relaxed">{product.short_description}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-[28px] lg:text-[34px] font-bold tracking-tight">
                <span className="text-primary">{product.price.toFixed(2)}</span>
                <span className="text-xl lg:text-2xl text-muted-foreground/40 ml-0.5">TL</span>
              </span>
              {discountPercent && (
                <span className="text-base text-muted-foreground/40 line-through">{product.compare_at_price!.toFixed(2)} TL</span>
              )}
            </div>

            <Separator className="bg-border/40" />

            {/* Stock */}
            <div className="flex items-center gap-3 flex-wrap">
              {!isOutOfStock && !lowStock && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-lg border border-green-200/50 dark:border-green-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Stokta
                </span>
              )}
              {lowStock && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Son {product.stock_quantity} ürün
                </span>
              )}
              {isOutOfStock && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-200/50 dark:border-red-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Stokta yok
                </span>
              )}
              {product.sku && (
                <span className="text-[11px] text-muted-foreground/40 ml-auto">SKU: {product.sku}</span>
              )}
            </div>

            <Separator className="bg-border/40" />

            {/* Quantity + Add to Cart */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-border/40 rounded-xl overflow-hidden bg-background/50 backdrop-blur-sm">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                    className="h-11 w-11 flex items-center justify-center text-muted-foreground/60 hover:bg-muted/40 transition-colors disabled:opacity-20 disabled:cursor-default"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    value={qty}
                    onChange={e => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, maxQty)))}
                    className="w-14 text-center border-0 h-11 text-sm font-medium bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setQty(Math.min(qty + 1, maxQty))}
                    className="h-11 w-11 flex items-center justify-center text-muted-foreground/60 hover:bg-muted/40 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground/60">
                  Toplam: <strong className="text-foreground">{(product.price * qty).toFixed(2)} TL</strong>
                </span>
              </div>

              <Button
                size="lg"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className={cn(
                  'w-full h-12 rounded-xl font-semibold transition-all duration-300 shadow-lg',
                  added ? 'bg-green-600 hover:bg-green-600 shadow-green-600/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20',
                )}
              >
                {added ? (
                  <><Check className="h-5 w-5 mr-2" /> Sepete Eklendi</>
                ) : isOutOfStock ? (
                  'Stokta Yok'
                ) : (
                  <><ShoppingCart className="h-5 w-5 mr-2" /> Sepete Ekle</>
                )}
              </Button>
            </div>

            <Separator className="bg-border/40" />

            {/* Trust */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Truck, title: 'Kargo', desc: 'Ücretsiz kargo', sub: '500 TL üzeri' },
                { icon: ShieldCheck, title: 'Ödeme', desc: 'Güvenli ödeme', sub: '256-bit SSL' },
                { icon: RefreshCw, title: 'İade', desc: '14 gün içinde', sub: 'Ücretsiz iade' },
              ].map(x => (
                <div key={x.title} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/15">
                  <div className="p-2 rounded-lg bg-primary/5"><x.icon className="h-4 w-4 text-primary/70" /></div>
                  <div><p className="text-xs font-medium">{x.desc}</p><p className="text-[10px] text-muted-foreground/50">{x.sub}</p></div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground/50 bg-muted/20 rounded-xl px-4 py-3 border border-border/15">
              <MapPin className="h-3.5 w-3.5 text-primary/50" />
              <span>Türkiye geneli kargo ile teslimat</span>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <motion.div variants={itemAnim} className="max-w-4xl">
          <div className="flex gap-0 border-b border-border/20 mb-8">
            <button onClick={() => setTab('desc')}
              className={cn('px-5 py-3 text-sm font-medium transition-colors relative', tab === 'desc' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-foreground/70')}>
              Açıklama
              {tab === 'desc' && <motion.div layoutId="dash-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
            <button onClick={() => setTab('specs')}
              className={cn('px-5 py-3 text-sm font-medium transition-colors relative', tab === 'specs' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-foreground/70')}>
              Özellikler
              {tab === 'specs' && <motion.div layoutId="dash-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'desc' ? (
              <motion.div key="desc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="relative overflow-hidden rounded-2xl border-2 border-border/40 bg-card/40 backdrop-blur-sm p-6">
                  <div className="text-sm text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {product.description || 'Açıklama bulunmuyor.'}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="specs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="relative overflow-hidden rounded-2xl border-2 border-border/40 bg-card/40 backdrop-blur-sm p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {specs.map(([l, v]) => (
                      <div key={l} className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/20 border border-border/10">
                        <span className="text-xs text-muted-foreground/60">{l}</span>
                        <span className="text-xs font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Related */}
        {related.length > 0 && (
          <motion.div variants={itemAnim} className="pt-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg lg:text-xl font-bold">Benzer Ürünler</h2>
                <p className="text-sm text-muted-foreground/60 mt-0.5">Bunlar da ilginizi çekebilir</p>
              </div>
              <Link href="/dashboard/store" className="text-sm font-medium text-primary hover:underline underline-offset-2">
                Tümünü Gör &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {related.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link href={`/dashboard/store/${p.slug}`} className="group block">
                    <div className="rounded-xl lg:rounded-2xl border-2 border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                      <div className="aspect-square bg-[#f5f5f5] dark:bg-[#1a1a1a] overflow-hidden relative">
                        {p.main_image_url ? (
                          <Image src={p.main_image_url} alt={p.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/15" /></div>
                        )}
                        {p.compare_at_price && p.compare_at_price > p.price && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-red-500/90 backdrop-blur-sm text-white text-[9px] font-bold shadow">
                            -{Math.round((1 - p.price / p.compare_at_price) * 100)}%
                          </div>
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
          </motion.div>
        )}

        <div className="h-4" />
      </motion.div>
    </DashboardShell>
  );
}
