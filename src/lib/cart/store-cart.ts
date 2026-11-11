export interface StoreItem {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

const STORE_CART_KEY = 'axis3_cart_store';

function deduplicateItems(items: StoreItem[]): StoreItem[] {
  const map = new Map<string, StoreItem>();
  for (const item of items) {
    const existing = map.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.totalPrice = existing.unitPrice * existing.quantity;
    } else {
      map.set(item.productId, { ...item });
    }
  }
  return Array.from(map.values());
}

export function getStoreItems(): StoreItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_CART_KEY) || '[]') as StoreItem[];
    return deduplicateItems(raw);
  } catch {
    return [];
  }
}

export function saveStoreItems(items: StoreItem[]) {
  const clean = deduplicateItems(items);
  localStorage.setItem(STORE_CART_KEY, JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent('store-cart-updated'));
  syncStoreCart(clean);
}

export function clearStoreCart() {
  localStorage.removeItem(STORE_CART_KEY);
  window.dispatchEvent(new CustomEvent('store-cart-updated'));
  syncStoreCart([]);
}

export function getStoreCartVersion(): number {
  try {
    return parseInt(localStorage.getItem('axis3_cart_store_version') || '0', 10);
  } catch {
    return 0;
  }
}

let _syncPromise: Promise<boolean> | null = null;

async function syncStoreCartWithRetry(items: StoreItem[], maxRetries = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('/api/cart/sync-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        // Sync succeeded — increment version so loadFromDb can compare
        try { localStorage.setItem('axis3_cart_store_version', String(Date.now())); } catch { /* ignore */ }
        return true;
      }
      console.warn(`[Cart] Sync failed (attempt ${i + 1}/${maxRetries}):`, res.status);
    } catch (err) {
      console.warn(`[Cart] Sync error (attempt ${i + 1}/${maxRetries}):`, err);
    }
    if (i < maxRetries - 1) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  return false;
}

async function syncStoreCart(items: StoreItem[]) {
  // Wait for any in-flight sync to complete first to prevent race conditions
  while (_syncPromise) {
    try { await _syncPromise; } catch { /* ignore */ }
  }

  _syncPromise = syncStoreCartWithRetry(items);

  try {
    return await _syncPromise;
  } finally {
    _syncPromise = null;
  }
}

let _loadPromise: Promise<void> | null = null;

export async function loadStoreCartFromDb(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const localItems = getStoreItems();

      // Always sync local state to DB first (even if empty).
      // This ensures DB is cleaned of stale/deleted items before reading back.
      const syncOk = await syncStoreCart(localItems);

      if (!syncOk) {
        // Sync failed — DB may contain stale items.
        // Keep local state (which is already clean) rather than overwriting with stale DB.
        return;
      }

      const res = await fetch('/api/cart/sync-store');
      if (!res.ok) return;
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        // DB was just synced from local state, so reading back is safe.
        // Only overwrite if DB returned items (to handle the cross-device scenario).
        if (data.items.length > 0) {
          const clean = deduplicateItems(data.items);
          localStorage.setItem(STORE_CART_KEY, JSON.stringify(clean));
          window.dispatchEvent(new CustomEvent('store-cart-updated'));
        }
        // If DB returned empty but local had items (shouldn't happen after sync),
        // keep local items.
      }
    } catch {
      // silently fail
    }
  })();

  _loadPromise.finally(() => { _loadPromise = null; });
  return _loadPromise;
}
