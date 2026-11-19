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

/**
 * Sunucunun hesapladığı mağaza fiyatlarını sepete uygular.
 *
 * Sipariş `409 price_changed` döndüğünde (ör. admin ürün fiyatını değiştirdi)
 * istemci bunu çağırır; aksi hâlde sepet eski fiyatı gösterip her denemede
 * aynı hataya düşer. `index`, istekteki `storeItems` sırasıyla aynıdır.
 */
export function applyStoreItemPrices(
  updates: { index: number; unitPrice: number; totalPrice: number }[]
): boolean {
  if (typeof window === 'undefined') return false;

  const items = getStoreItems();
  let applied = false;

  for (const update of updates) {
    const item = items[update.index];
    if (!item) continue;
    item.unitPrice = update.unitPrice;
    item.totalPrice = update.totalPrice;
    applied = true;
  }

  if (applied) saveStoreItems(items);
  return applied;
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
      // Önce sunucudaki sepeti oku. Önceden yerel (boş olabilen) sepet önce
      // DB'ye yazılıyordu; bu yüzden yeni bir cihazda giriş yapan kullanıcı,
      // başka cihazda doldurduğu mağaza sepetini siliyordu.
      const res = await fetch('/api/cart/sync-store');
      if (!res.ok) return;
      const data = await res.json();
      const remote: StoreItem[] = Array.isArray(data.items) ? data.items : [];
      const local = getStoreItems();

      if (local.length === 0 && remote.length > 0) {
        // Bu cihazda sepet yok: sunucudaki sepeti benimse.
        const clean = deduplicateItems(remote);
        localStorage.setItem(STORE_CART_KEY, JSON.stringify(clean));
        window.dispatchEvent(new CustomEvent('store-cart-updated'));
        return;
      }

      // Yerelde sepet varsa bu oturumun güncel hali kabul edilir ve sunucuya
      // yazılır. Sunucudaki miktarlarla toplamak, aynı sepeti iki kez sayıp
      // adetleri şişirirdi.
      if (local.length > 0) {
        await syncStoreCart(local);
      }
    } catch {
      // silently fail
    }
  })();

  _loadPromise.finally(() => { _loadPromise = null; });
  return _loadPromise;
}
