'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, ChevronDown, RotateCcw, Tag } from 'lucide-react';
import { useState } from 'react';
import type { StoreCategory } from '@/lib/services/store-service';
import { cn } from '@/lib/utils';

interface ProductFiltersProps {
  categories: StoreCategory[];
  currentCategory: string;
  currentMinPrice: string;
  currentMaxPrice: string;
  updateParams: (updates: Record<string, string>) => void;
}

export function ProductFilters({
  categories,
  currentCategory,
  currentMinPrice,
  currentMaxPrice,
  updateParams,
}: ProductFiltersProps) {
  const [showCategories, setShowCategories] = useState(true);
  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);

  const activeFilterCount = [currentCategory, currentMinPrice, currentMaxPrice].filter(Boolean).length;

  const handlePriceFilter = () => {
    const updates: Record<string, string> = {};
    if (minPrice) updates.min_price = minPrice;
    else updates.min_price = '';
    if (maxPrice) updates.max_price = maxPrice;
    else updates.max_price = '';
    updateParams(updates);
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    updateParams({ category_slug: '', min_price: '', max_price: '' });
  };

  return (
    <div className="space-y-5">
      {/* Kategoriler */}
      <div>
        <button
          onClick={() => setShowCategories(!showCategories)}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <Tag className="h-4 w-4 text-primary" />
            Kategoriler
          </h3>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              showCategories && 'rotate-180'
            )}
          />
        </button>
        {showCategories && (
          <div className="space-y-1">
            <button
              onClick={() => updateParams({ category_slug: '' })}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                !currentCategory
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm border border-primary/20'
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-transparent'
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  !currentCategory ? 'bg-primary' : 'bg-muted-foreground/30'
                )} />
                Tüm Ürünler
              </span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => updateParams({ category_slug: cat.slug })}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                  currentCategory === cat.slug
                    ? 'bg-primary/10 text-primary font-semibold shadow-sm border border-primary/20'
                    : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-transparent'
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    currentCategory === cat.slug ? 'bg-primary' : 'bg-muted-foreground/30'
                  )} />
                  {cat.name}
                  {cat.product_count != null && (
                    <span className="ml-auto text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                      {cat.product_count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fiyat Aralığı */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Fiyat Aralığı
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₺</span>
            <Input
              placeholder="Min"
              type="number"
              min="0"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlePriceFilter(); }}
              className="pl-7 h-10 text-sm rounded-xl"
            />
          </div>
          <span className="flex items-center text-muted-foreground text-xs">—</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₺</span>
            <Input
              placeholder="Maks"
              type="number"
              min="0"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlePriceFilter(); }}
              className="pl-7 h-10 text-sm rounded-xl"
            />
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          className="w-full mt-2 h-9 text-xs rounded-xl"
          onClick={handlePriceFilter}
        >
          Filtrele
        </Button>
      </div>

      {/* Aktif Filtreler */}
      {activeFilterCount > 0 && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 rounded-xl border-dashed"
            onClick={clearFilters}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Filtreleri Temizle ({activeFilterCount})
          </Button>
        </div>
      )}
    </div>
  );
}
