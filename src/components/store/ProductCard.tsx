'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { StoreProduct } from '@/lib/services/store-service';
import Image from 'next/image';
import { toast } from 'sonner';
import { saveStoreItems, getStoreItems } from '@/lib/cart/store-cart';
import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';

interface ProductCardProps {
  product: StoreProduct;
  viewMode: 'grid' | 'list';
  index?: number;
  basePath?: string;
}

export function ProductCard({ product, viewMode, index = 0, basePath = '/store' }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const current = getStoreItems();
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        existing.quantity += 1;
        existing.totalPrice = existing.unitPrice * existing.quantity;
      } else {
        current.push({ productId: product.id, quantity: 1, name: product.name, slug: product.slug, unitPrice: product.price, imageUrl: product.main_image_url || '', totalPrice: product.price });
      }
      saveStoreItems(current);
      setIsAdded(true);
      toast.success(`${product.name} sepete eklendi`, { icon: <ShoppingCart className="h-4 w-4" /> });
      setTimeout(() => setIsAdded(false), 1200);
    } catch {
      toast.error('Sepete eklenirken hata oluştu');
    }
  }, [product]);

  const discountPercent = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : null;

  const isOutOfStock = product.track_stock && product.stock_quantity <= 0 && !product.allow_backorder;
  const isLowStock = product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5;

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <Link href={`${basePath}/${product.slug}`}>
          <div
            className="group relative flex gap-5 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="relative w-28 h-28 rounded-xl bg-muted overflow-hidden flex-shrink-0">
              {product.main_image_url ? (
                <Image
                  src={product.main_image_url}
                  alt={product.name}
                  fill
                  className={cn('object-cover transition-transform duration-500', isHovered && 'scale-110')}
                  sizes="112px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
              {discountPercent && (
                <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md">
                  -{discountPercent}%
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {product.category && (
                <span className="text-[11px] font-medium text-primary/70 uppercase tracking-wider mb-0.5">
                  {product.category.name}
                </span>
              )}
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate">
                {product.name}
              </h3>
              {product.short_description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{product.short_description}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-lg font-bold text-primary">{product.price.toFixed(2)} TL</span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-sm text-muted-foreground/60 line-through">{product.compare_at_price.toFixed(2)} TL</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {isLowStock && (
                  <span className="text-[11px] text-amber-600 font-medium">Son {product.stock_quantity}</span>
                )}
                {product.track_stock && !isOutOfStock && !isLowStock && (
                  <span className="flex items-center gap-1 text-[11px] text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Stokta
                  </span>
                )}
                {isOutOfStock && (
                  <span className="flex items-center gap-1 text-[11px] text-red-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Stok yok
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <Button
                size="sm"
                className={cn('rounded-xl gap-1.5 h-9 px-4 min-w-[100px] transition-all duration-300', isAdded && 'bg-green-600 hover:bg-green-600')}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isAdded ? (
                  <><Check className="h-3.5 w-3.5" /> Eklendi</>
                ) : isOutOfStock ? (
                  'Stok Yok'
                ) : (
                  <><ShoppingCart className="h-3.5 w-3.5" /> Sepete Ekle</>
                )}
              </Button>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link href={`${basePath}/${product.slug}`}>
        <div
          className="group relative bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full flex flex-col"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative aspect-square bg-muted overflow-hidden">
            {product.main_image_url ? (
              <Image
                src={product.main_image_url}
                alt={product.name}
                fill
                className={cn('object-cover transition-all duration-500', isHovered && 'scale-110')}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-20 w-20 text-muted-foreground/20" />
              </div>
            )}

            <div className={cn('absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300', isHovered && 'opacity-100')} />

            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {discountPercent && (
                <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 text-[11px] px-2 py-0.5 shadow-lg">
                  -{discountPercent}%
                </Badge>
              )}
              {product.is_featured && (
                <Badge variant="secondary" className="bg-amber-500/90 hover:bg-amber-500 text-white border-0 text-[11px] px-2 py-0.5 shadow-lg backdrop-blur-sm">
                  Öne Çıkan
                </Badge>
              )}
            </div>

            <div className={cn('absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 max-lg:opacity-100 max-lg:translate-y-0', isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
              <Button
                size="sm"
                className={cn('w-full rounded-xl gap-2 h-10 shadow-xl transition-all duration-300', isAdded ? 'bg-green-600 hover:bg-green-600' : 'bg-primary hover:bg-primary/90')}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isAdded ? (
                  <><Check className="h-4 w-4" /> Sepete Eklendi</>
                ) : isOutOfStock ? (
                  'Stok Yok'
                ) : (
                  <><ShoppingCart className="h-4 w-4" /> Sepete Ekle</>
                )}
              </Button>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col">
            {product.category && (
              <span className="text-[11px] font-medium text-primary/70 uppercase tracking-wider mb-1">
                {product.category.name}
              </span>
            )}
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate">
              {product.name}
            </h3>
            {product.short_description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 flex-1">{product.short_description}</p>
            )}

            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-lg font-bold text-primary">{product.price.toFixed(2)} TL</span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-sm text-muted-foreground/50 line-through">{product.compare_at_price.toFixed(2)} TL</span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 min-h-[22px]">
              {isLowStock && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 rounded-lg px-2 py-0">
                  Son {product.stock_quantity}
                </Badge>
              )}
              {product.track_stock && !isOutOfStock && !isLowStock && (
                <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800/50 rounded-lg px-2 py-0">
                  Stokta
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="outline" className="text-[10px] text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800/50 rounded-lg px-2 py-0">
                  Stok yok
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
