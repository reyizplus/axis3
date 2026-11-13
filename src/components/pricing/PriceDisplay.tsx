/**
 * Price Display Component
 * Axis3 - Real-Time Animated Price Display
 *
 * Features:
 * - Animated number counter
 * - Delivery estimate
 * - Add to cart button
 * - Loading states
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  ShoppingBag,
  Info,
  Plus,
  Minus,
  Calculator,
  TriangleAlert,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { PricingResult } from '@/lib/pricing';

// =====================================================
// TYPES
// =====================================================

interface PriceDisplayProps {
  pricing: PricingResult | null;
  loading?: boolean;
  onAddToCart?: () => void;
  disabled?: boolean;
  isPreorder?: boolean;
  estimatedRestockDays?: number;
  unavailable?: boolean;
  quantity?: number;
  onQuantityChange?: (qty: number) => void;
  minQuantity?: number;
  /**
   * Fiyatın kaynağı: 'slicing' = gerçek dilimleme, 'volume' = hacim tahmini.
   * null ise henüz bilinmiyor (dilimleme sürüyor).
   */
  priceSource?: 'slicing' | 'volume' | null;
  /** Dilimleme isteği sürüyor mu. */
  slicing?: boolean;
  /**
   * K1: sunucu dilimleme zorunlu tutuyorsa ve elimizde gerçek dilimleme
   * sonucu yoksa sipariş verilemez. Fiyat gösterilir ama "tahmini" olarak
   * etiketlenir; buton kilitlenir.
   */
  locked?: boolean;
  lockedMessage?: string;
  /** Kilitliyken fiyatı yeniden doğrulamayı dener (dilimleme hatası sonrası). */
  onRetry?: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export function PriceDisplay({
  pricing,
  loading = false,
  onAddToCart,
  disabled = false,
  isPreorder = false,
  estimatedRestockDays,
  unavailable = false,
  quantity = 1,
  onQuantityChange,
  minQuantity = 1,
  priceSource = null,
  slicing = false,
  locked = false,
  lockedMessage = 'Fiyat doğrulanamadı',
  onRetry,
}: PriceDisplayProps) {
  const [displayPrice, setDisplayPrice] = useState(0);

  // Define animatePrice before useEffect to avoid immutability error
  const animatePrice = (from: number, to: number) => {
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = (to - from) / steps;
    let current = from;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      
      if (step >= steps) {
        setDisplayPrice(to);
        clearInterval(timer);
      } else {
        setDisplayPrice(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  };

  // Animate price changes
  useEffect(() => {
    if (pricing?.success) {
       
      animatePrice(displayPrice, pricing.totalPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing?.totalPrice]);

  if (loading) {
    return (
      <Card className="glass-light dark:glass">
        <CardHeader>
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-16 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!pricing || !pricing.success) {
    const failed = !!pricing && !pricing.success;

    return (
      <Card className="glass-light dark:glass">
        <CardHeader>
          <CardTitle>Fiyat Teklifi</CardTitle>
          <CardDescription>
            {slicing
              ? 'Model gerçek dilimleniyor'
              : failed
                ? 'Fiyat hesaplanamadı'
                : 'Malzeme ve kalite seçimi yapın'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              {slicing ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : failed ? (
                <TriangleAlert className="h-8 w-8 text-amber-500" />
              ) : (
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {slicing
                ? 'Fiyat, model gerçekten dilimlenerek hesaplanıyor. Bu birkaç saniye sürebilir.'
                : failed
                  ? pricing.error ?? 'Fiyat hesaplanamadı'
                  : 'Fiyat hesaplamak için tüm seçimleri tamamlayın'}
            </p>
            {slicing && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Hacim tahmininden fiyat verilmiyor.
              </p>
            )}
            {failed && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                Tekrar dene
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24 overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.02] pointer-events-none" />
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 rounded-full bg-primary" />
            <div className="space-y-1">
              <CardTitle className="text-lg">Fiyat Teklifi</CardTitle>
              <PriceSourceBadge source={priceSource} slicing={slicing} />
            </div>
          </div>
          {pricing.breakdown.quantityDiscount != null && pricing.breakdown.quantityDiscount > 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] px-2">
              İndirimli
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5 relative">
        {/* Animated Price */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center py-6 rounded-2xl bg-gradient-to-b from-primary/[0.03] to-transparent"
        >
          <div className="text-[2.5rem] sm:text-5xl font-bold gradient-text tracking-tight">
            ₺{displayPrice.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">
            {quantity > 1
              ? `₺${(displayPrice / quantity).toFixed(2)} / adet · KDV hariç`
              : 'Toplam fiyat · KDV hariç'}
          </div>
          {pricing.breakdown.vatRate > 0 ? (
            <div className="mt-1 text-xs text-muted-foreground">
              + KDV (%{Math.round(pricing.breakdown.vatRate * 100)}): ₺
              {pricing.breakdown.vatAmount.toFixed(2)} · KDV dahil ₺
              {pricing.breakdown.totalWithVat.toFixed(2)}
            </div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">
              KDV hesaplanacak
            </div>
          )}
          {isPreorder ? (() => {
            const da = pricing.breakdown.preorderDiscount;
            return da != null && da > 0 ? (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                <ShoppingBag className="h-3 w-3" /> -₺{da.toFixed(2)} ön sipariş indirimi
              </div>
            ) : null;
          })() : pricing.breakdown.quantityDiscount != null && pricing.breakdown.quantityDiscount > 0 ? (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
              -₺{pricing.breakdown.quantityDiscount.toFixed(2)} adet indirimi
            </div>
          ) : null}
        </motion.div>

        {/* Delivery Badge */}
        {!unavailable && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/[0.02] border border-primary/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tahmini Teslimat</div>
                <div className="text-sm font-semibold">
                  {isPreorder
                    ? `${estimatedRestockDays ?? 14} iş günü`
                    : `${pricing.deliveryDays} iş günü`}
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <div className="flex -space-x-1">
                <div className="h-5 w-5 rounded-full bg-primary/20 border-2 border-background" />
                <div className="h-5 w-5 rounded-full bg-primary/30 border-2 border-background" />
                <div className="h-5 w-5 rounded-full bg-primary/40 border-2 border-background" />
              </div>
              <span>güvenli</span>
            </div>
          </motion.div>
        )}

        {/* Fiyat doğrulanmadıysa sipariş kilitli (K1) */}
        {locked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3"
          >
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              {slicing ? (
                <Loader2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 animate-spin" />
              ) : (
                <TriangleAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              )}
              <span className="flex-1">
                {slicing
                  ? 'Fiyat gerçek dilimlemeyle doğrulanıyor, sipariş birkaç saniye içinde açılacak.'
                  : 'Fiyat doğrulanamadı; sipariş verebilmek için gerçek dilimleme sonucu gerekiyor.'}
              </span>
              {!slicing && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="shrink-0 rounded-md border border-amber-300/60 px-2 py-0.5 font-medium text-amber-700 transition-colors hover:bg-amber-100/60 dark:border-amber-700/60 dark:text-amber-300 dark:hover:bg-amber-900/40"
                >
                  Tekrar dene
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Quantity + Add to Cart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="flex items-center border rounded-xl h-12 px-1 w-full sm:w-28 justify-between shrink-0 bg-background">
            <button
              type="button"
              onClick={() => onQuantityChange?.(Math.max(minQuantity, quantity - 1))}
              disabled={quantity <= minQuantity}
              className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-bold text-base select-none tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange?.(quantity + 1)}
              className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="flex-1 h-12 text-base font-semibold shadow-lg shadow-primary/25"
            size="lg"
            onClick={onAddToCart}
            disabled={disabled || unavailable || locked}
          >
            {slicing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ShoppingCart className="mr-2 h-5 w-5" />
            )}
            {unavailable
              ? 'Stokta Yok'
              : locked
                ? slicing
                  ? 'Dilimleniyor…'
                  : lockedMessage
                : 'Sepete Ekle'}
          </Button>
        </motion.div>

        {/* Unavailable Info Box */}
        {unavailable && !isPreorder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4 text-center"
          >
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Bu malzeme stokta bulunmamaktadır
            </p>
          </motion.div>
        )}

        {/* Preorder Info Box */}
        {isPreorder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <ShoppingBag className="h-4 w-4" />
              Bu ürün ön sipariş verilecektir
            </div>
            <div className="flex items-start gap-2 text-xs text-amber-600/80 dark:text-amber-400/80">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                {estimatedRestockDays
                  ? `Tahmini teslimat ${estimatedRestockDays} iş günü içinde yapılacaktır.`
                  : 'Stok yenilendikten sonra siparişiniz hazırlanacaktır.'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Güvenli ödeme
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Anlık fiyat
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Kalite garantisi
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Fiyatın nereden geldiğini gösterir. Kullanıcı "tahmini" ile "gerçek
 * dilimleme"yi ayırt edemezse fiyat farkını sürpriz olarak yaşar.
 */
function PriceSourceBadge({
  source,
  slicing,
}: {
  source: 'slicing' | 'volume' | null;
  slicing: boolean;
}) {
  if (slicing || source === null) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        title="Dilimleme sonucu bekleniyor"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Hesaplanıyor
      </span>
    );
  }

  if (source === 'slicing') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400"
        title="Fiyat, modelin gerçek dilimlenmesinden gelen gram ve süre ile hesaplandı"
      >
        <Calculator className="h-3 w-3" />
        Gerçek dilimleme
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
      title="Fiyat hacim tahminine dayanır; kesin tutar sipariş anında doğrulanır"
    >
      <TriangleAlert className="h-3 w-3" />
      Tahmini
    </span>
  );
}
