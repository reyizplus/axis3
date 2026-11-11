'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  Loader2,
  Package,
  ShoppingCart,
  X,
  Filter,
  Sparkles,
  Truck,
  ShieldCheck,
  ArrowRight,
  Heart,
  Store,
  ChevronRight,
  Star,
  Percent,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  Grip,
} from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { ProductFilters } from '@/components/store/ProductFilters';
import { StorePagination } from '@/components/store/StorePagination';
import type { StoreProduct, StoreCategory } from '@/lib/services/store-service';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getStoreItems } from '@/lib/cart/store-cart';

interface PaginatedResponse {
  data: StoreProduct[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const categoryGradients = [
  'from-violet-500/20 to-purple-600/20',
  'from-blue-500/20 to-cyan-600/20',
  'from-emerald-500/20 to-teal-600/20',
  'from-orange-500/20 to-amber-600/20',
  'from-pink-500/20 to-rose-600/20',
  'from-indigo-500/20 to-blue-600/20',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function StoreSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="flex-1 h-11 bg-muted/50 rounded-xl animate-pulse" />
        <div className="w-[160px] h-11 bg-muted/50 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card overflow-hidden">
            <div className="aspect-square bg-muted/50 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-3 bg-muted/50 rounded animate-pulse w-1/4" />
              <div className="h-5 bg-muted/50 rounded animate-pulse w-2/3" />
              <div className="h-4 bg-muted/50 rounded animate-pulse w-1/2" />
              <div className="h-10 bg-muted/50 rounded-xl animate-pulse w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingCart() {
  const [itemCount, setItemCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateCart = () => {
      const items = getStoreItems();
      const count = items.reduce((sum, item) => sum + item.quantity, 0);
      setItemCount(count);
      setIsVisible(count > 0);
    };
    updateCart();
    window.addEventListener('storage', updateCart);
    window.addEventListener('cart-update', updateCart);
    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('cart-update', updateCart);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <Link href="/cart">
        <Button className="h-14 w-14 rounded-2xl shadow-2xl shadow-primary/30 relative" size="icon">
          <ShoppingBag className="h-6 w-6" />
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        </Button>
      </Link>
    </motion.div>
  );
}

function ActiveFilterTags({
  currentCategory,
  currentMinPrice,
  currentMaxPrice,
  categories,
  updateParams,
}: {
  currentCategory: string;
  currentMinPrice: string;
  currentMaxPrice: string;
  categories: StoreCategory[];
  updateParams: (updates: Record<string, string>) => void;
}) {
  const activeCategory = categories.find(c => c.slug === currentCategory);
  const tags: { label: string; onRemove: () => void }[] = [];

  if (activeCategory) {
    tags.push({
      label: activeCategory.name,
      onRemove: () => updateParams({ category_slug: '' }),
    });
  }
  if (currentMinPrice || currentMaxPrice) {
    tags.push({
      label: `₺${currentMinPrice || '0'} - ₺${currentMaxPrice || '∞'}`,
      onRemove: () => updateParams({ min_price: '', max_price: '' }),
    });
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-muted-foreground">Aktif Filtreler:</span>
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
          {tag.label}
          <button onClick={tag.onRemove} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        onClick={() => updateParams({ category_slug: '', min_price: '', max_price: '' })}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Temizle
      </button>
    </div>
  );
}

function FeaturedProducts({ products, onSelectCategory }: { products: StoreProduct[]; onSelectCategory: (slug: string) => void }) {
  const featured = products.filter(p => p.is_featured).slice(0, 8);
  if (featured.length < 2) return null;

  return (
    <section className="container mx-auto px-4 py-10 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Öne Çıkan Ürünler
          </h2>
          <Link href="/store?sort=newest" className="text-xs text-primary hover:underline underline-offset-2 flex items-center gap-0.5">
            Tümünü Gör <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4">
          {featured.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="snap-start flex-shrink-0 w-[180px]"
            >
              <Link href={`/store/${product.slug}`}>
                <div className="group rounded-xl overflow-hidden border border-border/40 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300">
                  <div className="aspect-square bg-muted overflow-hidden relative">
                    {product.main_image_url ? (
                      <img src={product.main_image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-md">
                        %{Math.round((1 - product.price / product.compare_at_price) * 100)}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{product.name}</p>
                    <p className="text-sm font-bold text-primary mt-1">{product.price.toFixed(2)} TL</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><StoreSkeleton /></div>}>
      <StorePageContent />
    </Suspense>
  );
}

function StorePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchValue, setSearchValue] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [freeShippingMin, setFreeShippingMin] = useState(500);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentPage = Math.max(1, Number(searchParams.get('page'))) || 1;
  const currentCategory = searchParams.get('category_slug') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentMinPrice = searchParams.get('min_price') || '';
  const currentMaxPrice = searchParams.get('max_price') || '';

  useEffect(() => { setSearchValue(currentSearch); }, [currentSearch]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentCategory) params.set('category_slug', currentCategory);
      if (currentSearch) params.set('search', currentSearch);
      if (currentSort) params.set('sort', currentSort);
      if (currentMinPrice) params.set('min_price', currentMinPrice);
      if (currentMaxPrice) params.set('max_price', currentMaxPrice);
      params.set('page', String(currentPage));
      params.set('per_page', '12');

      const res = await fetch(`/api/store/products?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PaginatedResponse = await res.json();
      setProducts(data.data || []);
      setPagination({ page: data.page, total: data.total, total_pages: data.total_pages });
    } catch (err) {
      console.error('Store: Failed to load products:', err);
      setError('Ürünler yüklenirken bir hata oluştu.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [currentCategory, currentSearch, currentSort, currentPage, currentMinPrice, currentMaxPrice]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/store/categories');
      if (!res.ok) return;
      const data: StoreCategory[] = await res.json();
      setCategories(data || []);
    } catch (err) { console.error('Store: Failed to load categories:', err); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    (async () => {
      try {
        const sr = await fetch('/api/admin/shipping-settings');
        if (sr.ok) {
          const sd = await sr.json();
          if (sd.settings?.freeShippingMinAmount) setFreeShippingMin(sd.settings.freeShippingMinAmount);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.set('page', '1');
    router.push(`/store?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchValue });
    searchInputRef.current?.blur();
  };

  const activeFilterCount = [currentCategory, currentMinPrice, currentMaxPrice].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0 || !!currentSearch;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <FloatingCart />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 via-primary/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-2 h-2 rounded-full bg-primary/30" />
          <div className="absolute bottom-20 left-1/3 w-3 h-3 rounded-full bg-primary/20" />
          <div className="absolute top-40 left-1/4 w-1.5 h-1.5 rounded-full bg-primary/25" />
        </div>

        <div className="container mx-auto px-4 py-14 sm:py-20 max-w-7xl relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-5">
                <Store className="h-3.5 w-3.5" />
                AXIS3 Mağazası
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
                <span className="gradient-text">3D Baskı Dünyası</span>
                <br />
                <span className="text-foreground">Kapını Aralıyor</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
                En kaliteli filamentler, aksesuarlar ve 3D baskı malzemeleri. Yaratıcılığınızı besleyecek her şey burada.
              </p>
            </motion.div>

            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-xl mx-auto relative"
            >
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Ürün, kategori veya malzeme ara..."
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    className="pl-12 pr-14 h-14 text-base rounded-2xl border-2 bg-card/80 backdrop-blur-sm shadow-lg shadow-primary/5 group-focus-within:border-primary/40 group-focus-within:shadow-primary/10 transition-all duration-300"
                  />
                  {searchValue && (
                    <button
                      type="button"
                      onClick={() => { setSearchValue(''); updateParams({ search: '' }); }}
                      className="absolute right-16 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 rounded-xl px-4 shadow-sm">Ara</Button>
                </div>
              </div>
            </motion.form>

            {categories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="flex flex-wrap items-center justify-center gap-2 mt-6"
              >
                <span className="text-xs text-muted-foreground mr-1">Popüler:</span>
                {categories.slice(0, 5).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => updateParams({ category_slug: cat.slug })}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                      currentCategory === cat.slug
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
                {categories.length > 5 && <span className="text-xs text-muted-foreground">+{categories.length - 5}</span>}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* TRUST BANNER */}
      <section className="border-y border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary/70" /> Ücretsiz Kargo ({freeShippingMin} TL üzeri)</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary/70" /> Güvenli Alışveriş</span>
            <span className="flex items-center gap-1.5"><RefreshCw className="h-4 w-4 text-primary/70" /> 14 Gün İade Garantisi</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary/70" /> Kaliteli Ürünler</span>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS CAROUSEL */}
      {!hasActiveFilters && (
        <FeaturedProducts products={products} onSelectCategory={(slug) => updateParams({ category_slug: slug })} />
      )}

      {/* CATEGORY SHOWCASE - above products */}
      {categories.length > 0 && !hasActiveFilters && (
        <section className="container mx-auto px-4 pt-8 pb-2 max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Kategorilere Göz At
              </h2>
              {categories.length > 4 && (
                <Button variant="ghost" size="sm" className="text-xs gap-1 rounded-xl text-muted-foreground">
                  Tümünü Gör <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4">
              {categories.map((cat, idx) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => updateParams({ category_slug: cat.slug })}
                  className="snap-start flex-shrink-0"
                >
                  <div className="group relative w-36 sm:w-44 h-36 sm:h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 group-hover:opacity-80 transition-opacity duration-300', categoryGradients[idx % categoryGradients.length])} />
                    <div className="absolute inset-0 p-4 flex flex-col justify-between">
                      <div className="w-10 h-10 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                        {cat.product_count != null && <p className="text-xs text-muted-foreground">{cat.product_count} ürün</p>}
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-y-1 group-hover:translate-y-0">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                </motion.button>
              ))}
              <button
                onClick={() => updateParams({ category_slug: '' })}
                className="snap-start flex-shrink-0 w-36 sm:w-44 h-36 sm:h-44 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/30 transition-all duration-300 hover:bg-muted/30 flex flex-col items-center justify-center gap-2"
              >
                <Grid3X3 className="h-6 w-6 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground/70 font-medium">Tüm Ürünler</span>
              </button>
            </div>
          </motion.div>
        </section>
      )}

      {/* ACTIVE SEARCH INDICATOR */}
      {currentSearch && (
        <section className="container mx-auto px-4 pb-4 max-w-7xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>
              <span className="font-medium text-foreground">&quot;{currentSearch}&quot;</span> için sonuçlar
              {pagination.total > 0 && <span> ({pagination.total} ürün)</span>}
            </span>
            <button onClick={() => updateParams({ search: '' })} className="text-primary hover:underline underline-offset-2 text-xs ml-2">
              Temizle
            </button>
          </div>
        </section>
      )}

      {/* MAIN CONTENT */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* SIDEBAR */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                <ProductFilters
                  categories={categories}
                  currentCategory={currentCategory}
                  currentMinPrice={currentMinPrice}
                  currentMaxPrice={currentMaxPrice}
                  updateParams={updateParams}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden rounded-xl h-9 border-muted-foreground/20">
                      <Filter className="h-4 w-4 mr-1.5" />
                      Filtrele
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px] rounded-full">{activeFilterCount}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <SheetTitle className="sr-only">Filtreler</SheetTitle>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold flex items-center gap-2 text-sm">
                          <Filter className="h-4 w-4 text-primary" />
                          Filtreler
                        </h2>
                        {activeFilterCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{activeFilterCount} aktif</Badge>}
                      </div>
                      <ProductFilters
                        categories={categories}
                        currentCategory={currentCategory}
                        currentMinPrice={currentMinPrice}
                        currentMaxPrice={currentMaxPrice}
                        updateParams={(updates) => { updateParams(updates); setMobileFilterOpen(false); }}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                <p className="text-sm text-muted-foreground">
                  {loading ? (
                    <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Yükleniyor...</span>
                  ) : (
                    <><span className="font-medium text-foreground">{pagination.total}</span> ürün bulundu</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={currentSort} onValueChange={v => updateParams({ sort: v })}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm rounded-xl border-muted-foreground/20">
                    <SlidersHorizontal className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Sırala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">En Yeni</SelectItem>
                    <SelectItem value="oldest">En Eski</SelectItem>
                    <SelectItem value="price_asc">Fiyat (Düşük → Yüksek)</SelectItem>
                    <SelectItem value="price_desc">Fiyat (Yüksek → Düşük)</SelectItem>
                    <SelectItem value="name_asc">İsim (A-Z)</SelectItem>
                    <SelectItem value="name_desc">İsim (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="hidden sm:flex gap-1 border border-muted-foreground/20 rounded-xl p-1">
                  <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setViewMode('grid')}>
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setViewMode('list')}>
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filter Tags */}
            <ActiveFilterTags
              currentCategory={currentCategory}
              currentMinPrice={currentMinPrice}
              currentMaxPrice={currentMaxPrice}
              categories={categories}
              updateParams={updateParams}
            />

            {/* PRODUCTS */}
            {loading ? (
              <StoreSkeleton />
            ) : error ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
                  <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Bir hata oluştu</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{error}</p>
                <Button onClick={fetchProducts} className="rounded-xl gap-2"><RefreshCw className="h-4 w-4" /> Tekrar Dene</Button>
              </motion.div>
            ) : products.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
                <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ürün bulunamadı</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                  Aradığınız kriterlere uygun ürün bulunamadı. Farklı filtrelemeler deneyin veya tüm ürünlere göz atın.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="default" className="rounded-xl gap-2" onClick={() => { router.push('/store'); }}>
                    Tüm Ürünleri Göster
                  </Button>
                  <Link href="/"><Button variant="outline" className="rounded-xl">Ana Sayfaya Dön</Button></Link>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" key={`${currentPage}-${currentCategory}-${currentSearch}-${currentSort}-${viewMode}`}>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {products.map((product, index) => (
                      <motion.div key={product.id} variants={itemVariants}>
                        <ProductCard product={product} viewMode="grid" index={index} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product, index) => (
                      <motion.div key={product.id} variants={itemVariants}>
                        <ProductCard product={product} viewMode="list" index={index} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <StorePagination currentPage={currentPage} totalPages={pagination.total_pages} onPageChange={(p) => updateParams({ page: String(p) })} />
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      {!currentCategory && !currentSearch && products.length > 0 && (
        <section className="border-t border-border/40 bg-muted/20 mt-10">
          <div className="container mx-auto px-4 py-12 max-w-7xl">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-8 sm:p-12 text-center">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">Özel Ürün veya Tasarım mı Arıyorsunuz?</h2>
                <p className="text-muted-foreground max-w-lg mx-auto mb-6">İhtiyacınıza özel 3D baskı çözümleri için bizimle iletişime geçin.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button className="rounded-xl gap-2 h-11 px-6" asChild>
                    <Link href="/iletisim">İletişime Geç <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button variant="outline" className="rounded-xl h-11 px-6" asChild>
                    <Link href="/blog">Blog&apos;u Keşfet</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
