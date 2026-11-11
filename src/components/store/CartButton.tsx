'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Trash2, X, Package } from 'lucide-react';
import { getStoreItems, saveStoreItems, StoreItem } from '@/lib/cart/store-cart';
import { cartService, type CartItem as ModelCartItem } from '@/lib/cart/cart-service';

export function CartButton() {
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [modelItems, setModelItems] = useState<ModelCartItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const update = () => {
    setStoreItems(getStoreItems());
    setModelItems(cartService.getItems());
  };

  useEffect(() => {
    update();
    window.addEventListener('storage', update);
    window.addEventListener('cart-update', update);
    window.addEventListener('store-cart-updated', update);
    window.addEventListener('cart-updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('cart-update', update);
      window.removeEventListener('store-cart-updated', update);
      window.removeEventListener('cart-updated', update);
    };
  }, []);

  // Verify store items exist when dropdown opens
  useEffect(() => {
    if (!open || storeItems.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const ids = storeItems.map(i => i.productId);
        const { data: products } = await supabase
          .from('store_products')
          .select('id')
          .eq('is_active', true)
          .in('id', ids) as any;
        const activeIds = new Set((products || []).map((p: any) => p.id));
        if (cancelled) return;
        const removed = storeItems.filter(i => !activeIds.has(i.productId));
        if (removed.length > 0) {
          const remaining = storeItems.filter(i => activeIds.has(i.productId));
          saveStoreItems(remaining);
          setStoreItems(remaining);
        }
      } catch { /* non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const itemCount = storeItems.reduce((sum, i) => sum + i.quantity, 0) + modelItems.reduce((sum, i) => sum + i.quantity, 0);
  const storeTotal = storeItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const modelTotal = modelItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const total = storeTotal + modelTotal;

  const removeStoreItem = (productId: string) => {
    const updated = storeItems.filter(i => i.productId !== productId);
    saveStoreItems(updated);
    setStoreItems(updated);
  };

  const removeModelItem = async (itemId: string) => {
    await cartService.removeItem(itemId);
    setModelItems(prev => prev.filter(i => i.id !== itemId));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Sepetim"
      >
        <ShoppingCart className="h-4 w-4" />
        {itemCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-[3px] rounded-md bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center leading-none shadow-sm ring-2 ring-background">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 max-sm:fixed max-sm:inset-x-0 max-sm:top-[var(--nav-height)] max-sm:w-auto max-sm:h-[calc(100vh-var(--nav-height))] max-sm:rounded-none max-sm:border-x-0 max-sm:border-b-0 z-50 bg-card border border-border/60 rounded-2xl shadow-xl shadow-black/5 animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <span className="text-sm font-semibold">Sepetim ({itemCount})</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Items */}
            {itemCount === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Sepetiniz boş
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
                {/* Store Items */}
                {storeItems.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden flex-shrink-0 relative">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/store/${item.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-sm font-medium truncate block hover:text-primary transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.quantity} x {item.unitPrice.toFixed(2)} TL
                      </p>
                    </div>
                    <button
                      onClick={() => removeStoreItem(item.productId)}
                      className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Kaldır"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Divider + header for model items */}
                {storeItems.length > 0 && modelItems.length > 0 && (
                  <div className="px-4 py-2 bg-muted/30">
                    <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">3D Baskı Dosyaları</span>
                  </div>
                )}

                {/* Model Cart Items */}
                {modelItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.fileName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.quantity} x {item.unitPrice.toFixed(2)} TL · {item.materialName}
                      </p>
                    </div>
                    <button
                      onClick={() => removeModelItem(item.id)}
                      className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Kaldır"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-border/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Toplam</span>
                <span className="font-bold text-base">{total.toFixed(2)} TL</span>
              </div>
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="block w-full text-center py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Sepete Git
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
