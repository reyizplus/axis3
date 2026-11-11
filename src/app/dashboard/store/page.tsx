'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Grid3X3, List, Package, X, RefreshCw, AlertCircle, Sparkles, ArrowRight,
} from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { StorePagination } from '@/components/store/StorePagination';
import type { StoreProduct, StoreCategory } from '@/lib/services/store-service';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PaginatedResponse {
  data: StoreProduct[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const container = { animate: { transition: { staggerChildren: 0.05 } } };
const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

function StoreSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
          <Skeleton className="aspect-square rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardStoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentPage = Math.max(1, Number(searchParams.get('page'))) || 1;
  const currentCategory = searchParams.get('category_slug') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentMinPrice = searchParams.get('min_price') || '';
  const currentMaxPrice = searchParams.get('max_price') || '';

  useEffect(() => { setSearchValue(currentSearch); }, [currentSearch]);

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (currentCategory) p.set('category_slug', currentCategory);
      if (currentSearch) p.set('search', currentSearch);
      if (currentSort) p.set('sort', currentSort);
      if (currentMinPrice) p.set('min_price', currentMinPrice);
      if (currentMaxPrice) p.set('max_price', currentMaxPrice);
      p.set('page', String(currentPage)); p.set('per_page', '12');
      const res = await fetch(`/api/store/products?${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PaginatedResponse = await res.json();
      setProducts(data.data || []);
      setPagination({ page: data.page, total: data.total, total_pages: data.total_pages });
    } catch { setError('Ürünler yüklenirken bir hata oluştu.'); setProducts([]); }
    finally { setLoading(false); }
  }, [currentCategory, currentSearch, currentSort, currentPage, currentMinPrice, currentMaxPrice]);

  const fetchCategories = useCallback(async () => {
    try { const res = await fetch('/api/store/categories'); if (!res.ok) return; setCategories((await res.json()) || []); } catch { /* */ }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateParams = (updates: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    p.set('page', '1');
    router.push(`/dashboard/store?${p.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); updateParams({ search: searchValue }); searchInputRef.current?.blur(); };

  const activeFilters = [
    currentCategory && { key: 'category_slug', label: `Kategori: ${categories.find(c => c.slug === currentCategory)?.name || currentCategory}` },
    currentMinPrice && { key: 'min_price', label: `Min: ${currentMinPrice} TL` },
    currentMaxPrice && { key: 'max_price', label: `Max: ${currentMaxPrice} TL` },
  ].filter(Boolean) as { key: string; label: string }[];
  const hasSearch = !!currentSearch;
  const hasActiveFilters = activeFilters.length > 0 || hasSearch;

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-8">
        {/* Hero */}
        <motion.div variants={item} className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Mağaza
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">3D Baskı Mağazası</h1>
              <p className="mt-1 text-sm text-muted-foreground">Hazır modeller, filamentler ve baskı malzemeleri</p>
            </div>
            {pagination.total > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Package className="h-4 w-4" />
                <span className="font-medium text-foreground">{pagination.total}</span> ürün
              </div>
            )}
          </div>
        </motion.div>

        {/* Search + Sort + View */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
            <Input
              ref={searchInputRef}
              placeholder="Ürün, kategori veya malzeme ara..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              className="pl-11 pr-10 h-12 rounded-xl border-2 border-border/60 bg-card/50 backdrop-blur-sm focus-visible:border-primary/40 transition-all"
            />
            {searchValue && (
              <button type="button" onClick={() => { setSearchValue(''); updateParams({ search: '' }); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          <div className="flex gap-2 items-center">
            <Select value={currentSort} onValueChange={(v) => updateParams({ sort: v })}>
              <SelectTrigger className="w-[140px] h-12 rounded-xl border-2 border-border/60 bg-card/50 backdrop-blur-sm">
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">En Yeni</SelectItem>
                <SelectItem value="price_asc">Fiyat (Düşük)</SelectItem>
                <SelectItem value="price_desc">Fiyat (Yüksek)</SelectItem>
                <SelectItem value="name_asc">Ad (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden sm:flex gap-0.5 border-2 border-border/60 rounded-xl p-1 bg-card/50 backdrop-blur-sm">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setViewMode('grid')}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setViewMode('list')}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Category pills + Active filters */}
        <motion.div variants={item} className="space-y-3">
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => updateParams({ category_slug: '' })}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-medium transition-all border',
                  !currentCategory
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                    : 'bg-card/50 text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground hover:bg-primary/5'
                )}
              >
                Tümü
              </button>
              {categories.slice(0, 10).map(cat => (
                <button key={cat.id} onClick={() => updateParams({ category_slug: currentCategory === cat.slug ? '' : cat.slug })}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-medium transition-all border',
                    currentCategory === cat.slug
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                      : 'bg-card/50 text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground hover:bg-primary/5'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              {hasSearch && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <Search className="h-3 w-3" /> &ldquo;{currentSearch}&rdquo;
                  <button onClick={() => { setSearchValue(''); updateParams({ search: '' }); }} className="ml-0.5 hover:text-primary/70"><X className="h-3 w-3" /></button>
                </span>
              )}
              {activeFilters.map(f => (
                <span key={f.key} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/70 border border-border/60 text-xs font-medium text-muted-foreground">
                  {f.label}
                  <button onClick={() => updateParams({ [f.key]: '' })} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <button onClick={() => { setSearchValue(''); router.push('/dashboard/store'); }} className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 ml-1">
                Temizle
              </button>
            </div>
          )}
        </motion.div>

        {/* Products */}
        {loading ? (
          <StoreSkeleton />
        ) : error ? (
          <motion.div variants={item} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 rounded-2xl bg-red-500/10 p-4"><AlertCircle className="h-10 w-10 text-red-500" /></div>
            <h3 className="text-lg font-semibold mb-1">Bir hata oluştu</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm">{error}</p>
            <Button onClick={fetchProducts} variant="outline" className="gap-2 rounded-xl"><RefreshCw className="h-4 w-4" /> Tekrar Dene</Button>
          </motion.div>
        ) : products.length === 0 ? (
          <motion.div variants={item} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                <Package className="h-9 w-9 text-primary/50" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Ürün bulunamadı</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">Aramanızla eşleşen ürün bulunamadı. Farklı filtrelemeler deneyin.</p>
            <Button onClick={() => router.push('/dashboard/store')} className="rounded-xl gap-2">Tüm Ürünleri Göster <ArrowRight className="h-4 w-4" /></Button>
          </motion.div>
        ) : (
          <motion.div variants={item} key={`${currentPage}-${currentCategory}-${currentSearch}-${currentSort}`}>
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {products.map((product, idx) => (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                      <ProductCard product={product} viewMode="grid" index={idx} basePath="/dashboard/store" />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {products.map((product, idx) => (
                    <motion.div key={product.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                      <ProductCard product={product} viewMode="list" index={idx} basePath="/dashboard/store" />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination */}
        <motion.div variants={item}>
          <StorePagination currentPage={currentPage} totalPages={pagination.total_pages} onPageChange={(p) => updateParams({ page: String(p) })} />
        </motion.div>

        <div className="h-4" />
      </motion.div>
    </DashboardShell>
  );
}

export default function DashboardStorePage() {
  return (
    <Suspense fallback={<DashboardShell><div className="p-6"><StoreSkeleton /></div></DashboardShell>}>
      <DashboardStoreContent />
    </Suspense>
  );
}
