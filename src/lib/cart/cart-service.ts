import type { CartItem, Cart } from './types';
import { isMissingColumnError } from '@/lib/supabase/errors';
import { requestOrderQuote, toOrderItemInput, getLastQuoteSettings } from './order-quote-client';
import { priceEstimate, selectDiscountTier } from '@/lib/pricing/core';
import type { LinePriceModel } from '@/lib/pricing/core';
import { roundMoney } from '@/lib/utils/money';

export type { CartItem } from './types';

const CART_STORAGE_PREFIX = 'axis3_cart_';
const CART_USER_KEY = 'axis3_cart_user';

/**
 * İki fiyat modeli aynı mı?
 *
 * Her teklif yeni bir nesne döndürür; referans karşılaştırması her zaman
 * "değişti" der ve sepeti gereksiz yere yeniden yazar (`cart-updated` → fazla
 * render). Modeller küçüktür (birkaç yüz bayt), değer karşılaştırması ucuzdur.
 */
function samePriceModel(
  a: LinePriceModel | null | undefined,
  b: LinePriceModel
): boolean {
  if (!a) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export class CartService {
  private syncInProgress = false;
  private pendingSync: (() => Promise<void>) | null = null;
  /** Aynı anda birden fazla teklif isteği gitmesin. */
  private repriceInFlight: Promise<CartItem[]> | null = null;
  /** Teklif uçarken sepet değiştiyse bitince bir kez daha çalış. */
  private repriceDirty = false;
  /** Adet butonuna art arda basmayı tek isteğe indirir. */
  private repriceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Sepetin fiyatı etkileyen kimliği. Teklif yanıtı bu imza değişmeden
   * uygulanmaz: aksi halde kullanıcı 5 → 6 → 7 yaparken ilk isteğin (5 adet)
   * fiyatı son sepete yazılır ve tutar "zıplar".
   */
  private priceSignature(items: CartItem[]): string {
    return items
      .map(
        (item) =>
          [
            item.id,
            item.quantity,
            item.supportEnabled === false ? 0 : 1,
            item.printSettingId ?? '',
            item.color ?? '',
            item.nozzleSizeMm ?? '',
            item.customLayerHeight ?? '',
            item.customInfillPercentage ?? '',
            item.customTimeMultiplier ?? '',
          ].join(':')
      )
      .join('|');
  }

  private getStorageKey(userId?: string): string {
    if (!userId) {
      return `${CART_STORAGE_PREFIX}anonymous`;
    }
    return `${CART_STORAGE_PREFIX}${userId}`;
  }

  private getCurrentUserId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(CART_USER_KEY);
    } catch {
      return null;
    }
  }

  setUserId(userId: string | null): void {
    if (typeof window === 'undefined') return;

    try {
      const previousUserId = this.getCurrentUserId();

      let anonymousItems: CartItem[] | null = null;
      const anonStorageKey = this.getStorageKey();
      if (!previousUserId && userId) {
        try {
          const stored = localStorage.getItem(anonStorageKey);
          if (stored) {
            const anonCart: Cart = JSON.parse(stored);
            if (anonCart.items && anonCart.items.length > 0) {
              anonymousItems = anonCart.items;
            }
          }
        } catch {}
      }

      if (userId) {
        localStorage.setItem(CART_USER_KEY, userId);
      } else {
        localStorage.removeItem(CART_USER_KEY);
      }

      if (anonymousItems) {
        const cart = this.getCart();
        for (const item of anonymousItems) {
          const existingIndex = cart.items.findIndex(
            i => i.fileId === item.fileId &&
                 i.materialId === item.materialId &&
                 i.printSettingId === item.printSettingId
          );
          if (existingIndex >= 0) {
            const merged = cart.items[existingIndex];
            merged.quantity += item.quantity;
            // Model varsa birleşmiş adet anında fiyatlanır; yoksa sunucu
            // fiyatı gelene kadar "Hesaplanıyor" gösterilir.
            merged.pricingPending = !this.applyInstantPrice(merged, merged.quantity);
          } else {
            cart.items.push({ ...item });
          }
        }
        this.saveCart(cart);
        localStorage.removeItem(anonStorageKey);
        // Anonim sepetten gelen adetler birleşti; birim fiyat adede bağlı
        // olduğu için sunucudan tazelenmeli.
        this.scheduleReprice(0);
      }

      if (previousUserId && previousUserId !== userId) {
        this.clearUserCart(previousUserId);
      }

      if (!userId) {
        localStorage.removeItem(anonStorageKey);
      }
    } catch (error) {
      console.error('[CartService] Failed to set user ID:', error);
    }
  }

  private clearUserCart(userId: string): void {
    if (typeof window === 'undefined') return;

    try {
      const key = this.getStorageKey(userId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[CartService] Failed to clear user cart:', error);
    }
  }

  getCart(): Cart {
    if (typeof window === 'undefined') {
      return this.getEmptyCart();
    }

    try {
      const userId = this.getCurrentUserId();
      const storageKey = this.getStorageKey(userId || undefined);
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        return this.getEmptyCart();
      }

      const cart: Cart = JSON.parse(stored);

      if (cart.userId && userId && cart.userId !== userId) {
        this.clear();
        return this.getEmptyCart();
      }

      return cart;
    } catch (error) {
      console.error('[CartService] Failed to load cart:', error);
      return this.getEmptyCart();
    }
  }

  getItems(): CartItem[] {
    return this.getCart().items;
  }

  async addItem(item: Omit<CartItem, 'id' | 'addedAt'>): Promise<CartItem> {
    const cart = this.getCart();

    const existingIndex = cart.items.findIndex(
      i => i.fileId === item.fileId &&
           i.materialId === item.materialId &&
           i.printSettingId === item.printSettingId &&
           (i.supportEnabled !== false) === (item.supportEnabled !== false)
    );

    let newItem: CartItem;

    if (existingIndex >= 0) {
      const existing = cart.items[existingIndex];
      existing.quantity += item.quantity;
      existing.unitPrice = item.unitPrice;
      // `unitPrice` tek adet fiyatıdır; toplam adet indirimiyle değişir.
      // Geçici `birim × adet` yazmak ekranda yanlış (yüksek) tutar gösterip
      // sonra düşürüyordu. Model varsa fiyat anında ve doğru hesaplanır;
      // yoksa sunucu yanıtı gelene kadar "Hesaplanıyor" gösterilir.
      existing.pricingPending = !this.applyInstantPrice(existing, existing.quantity);
      newItem = existing;
    } else {
      newItem = {
        ...item,
        id: this.generateId(),
        addedAt: new Date().toISOString(),
      };
      // Fiyat modeli geldiyse tutarı burada da hesaplayabiliriz; gelmediyse
      // sunucu teklifi belirleyici olur.
      newItem.pricingPending = !this.applyInstantPrice(newItem, item.quantity);
      cart.items.push(newItem);
    }

    this.saveCart(cart);
    this.enqueueSync(() => this.syncCartToDb(cart));

    // Birleştirme sonrası adet arttı: `birim × adet` yanlış olabilir (adet
    // indirimi, satır başına bir kez alınan giderler). Sunucu fiyatını uygula.
    if (existingIndex >= 0) {
      this.scheduleReprice();
      return newItem;
    }

    return newItem;
  }

  async removeItem(itemId: string): Promise<void> {
    const cart = this.getCart();
    cart.items = cart.items.filter(item => item.id !== itemId);
    this.saveCart(cart);
    await this.syncCartToDb(cart);
  }

  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    if (quantity < 1) {
      await this.removeItem(itemId);
      return;
    }

    const cart = this.getCart();
    const item = cart.items.find(i => i.id === itemId);

    if (item) {
      item.quantity = quantity;
      // Fiyat, sunucudan gelen modelle ANINDA hesaplanır: "+" tıklandığı anda
      // tutar güncellenir, "Fiyat hesaplanıyor" beklenmez. Aynı saf fonksiyon
      // sunucuda da çalıştığı için gösterilen tutar sipariş tutarıyla aynıdır.
      // Model yoksa (eski sepet) tek seferlik "hesaplanıyor" durumu gösterilir.
      const instant = this.applyInstantPrice(item, quantity);
      item.pricingPending = !instant;
      this.saveCart(cart);
      this.enqueueSync(() => this.syncCartToDb(cart));
      // Arka planda tazeleme: stok/ön sipariş ve yönetici ayar değişiklikleri
      // adede bağlı olabilir. Kullanıcıyı bekletmez.
      this.scheduleReprice();
    }
  }

  /**
   * Adet değişimini, sunucudan gelen `priceModel` ile yerelde fiyatlar.
   *
   * `priceEstimate` fiyat motorunun kendi saf fonksiyonudur; sunucu da aynı
   * fonksiyonu çağırır. Bu yüzden burada üretilen tutar bir "tahmin" değil,
   * sunucunun siparişte hesaplayacağı tutarın aynısıdır.
   *
   * @returns Model yoksa veya hesaplanamazsa `false` (çağıran "hesaplanıyor"
   *          durumuna düşer ve sunucu yanıtını bekler).
   */
  private applyInstantPrice(item: CartItem, quantity: number): boolean {
    const model = item.priceModel;
    if (!model) return false;

    try {
      const quote = priceEstimate(model.estimate, model.terms, quantity);
      const tier = selectDiscountTier(quantity, model.terms.quantityDiscountTiers);
      const discount = quote.breakdown.quantityDiscount ?? 0;

      item.quantity = quantity;
      item.unitPrice = roundMoney(quote.breakdown.pricePerUnit);
      item.totalPrice = roundMoney(quote.breakdown.totalPrice);
      item.quantityDiscount = discount;
      item.quantityDiscountPercent =
        discount > 0 ? tier?.discountPercent ?? null : null;
      item.estimatedTime = quote.estimatedTime.correctedTimeHours;
      return true;
    } catch {
      // Model bozuksa fiyatı uydurmuyoruz; sunucu yanıtı belirleyici olur.
      return false;
    }
  }

  /**
   * Adet değişikliklerini birleştirir: kullanıcı +/- butonuna art arda
   * bastığında her tıklama için ayrı teklif isteği gitmez, sepet durulunca
   * tek istek gider.
   */
  scheduleReprice(delay = 200): void {
    if (typeof window === 'undefined') return;

    if (this.repriceTimer) clearTimeout(this.repriceTimer);
    this.repriceTimer = setTimeout(() => {
      this.repriceTimer = null;
      void this.repriceCart();
    }, delay);
  }

  /**
   * Sepetteki 3D kalemlerin birim/toplam fiyatlarını sunucudan tazeler.
   *
   * Sipariş oluşturma ile aynı fiyat otoritesini (`/orders/quote`) kullanır.
   * İki koruma vardır:
   * - aynı anda tek istek (koşan istek varsa sonuç beklenir, sonra gerekirse
   *   yeniden çalışır),
   * - yanıt uygulanmadan önce sepet imzası kontrol edilir; kullanıcı bu arada
   *   adedi değiştirdiyse eski yanıt atılır (fiyat zıplaması olmaz).
   */
  async repriceCart(): Promise<CartItem[]> {
    if (typeof window === 'undefined') return this.getCart().items;

    if (this.repriceInFlight) {
      this.repriceDirty = true;
      return this.repriceInFlight;
    }

    this.repriceInFlight = (async () => {
      try {
        let items = this.getCart().items;

        // En fazla 4 tur: sepet sürekli değişse bile döngü kilitlenmesin.
        for (let attempt = 0; attempt < 4; attempt++) {
          this.repriceDirty = false;
          items = await this.runQuote();
          if (!this.repriceDirty) break;
        }

        return items;
      } finally {
        this.repriceInFlight = null;
      }
    })();

    return this.repriceInFlight;
  }

  /** Tek bir teklif isteği; yanıt sepetin güncel haline ait değilse atılır. */
  private async runQuote(): Promise<CartItem[]> {
    const cart = this.getCart();
    if (cart.items.length === 0) return cart.items;

    const signature = this.priceSignature(cart.items);

    const { quote } = await requestOrderQuote({
      items: cart.items.map(toOrderItemInput),
      storeItems: [],
    });

    const current = this.getCart().items;

    if (!quote || quote.items.length === 0) {
      // Ağ/oturum/limit hatası: fiyatı bozma, "hesaplanıyor" göstergesini
      // kapat. Sipariş anında sunucu tutarı yine kendi hesaplar.
      this.clearPricingPending();
      return this.getCart().items;
    }

    if (signature !== this.priceSignature(current)) {
      // Sepet, istek uçarken değişti: bu yanıt bayat. Uygulanırsa müşteri
      // önceki adedin fiyatını görür. Güncel sepet için yeniden iste.
      this.repriceDirty = true;
      return current;
    }

    await this.applyServerPrices(quote.items);
    return this.getCart().items;
  }

  /**
   * Sunucunun son teklifte bildirdiği adet indirimi kademeleri.
   *
   * Sepet, "10 adette %5 indirim" gibi bir sonraki eşiği bununla gösterir;
   * kademe listesi istemcide ayrıca tanımlanmaz (sunucu tek kaynak).
   */
  getQuantityDiscountTiers(): { minQty: number; discountPercent: number }[] {
    return getLastQuoteSettings()?.quantityDiscountTiers ?? [];
  }

  /** Bekleyen "hesaplanıyor" işaretlerini temizler; değişiklik olduysa yazar. */
  private clearPricingPending(): boolean {    const cart = this.getCart();
    let changed = false;

    for (const item of cart.items) {
      if (item.pricingPending) {
        item.pricingPending = false;
        changed = true;
      }
    }

    if (changed) this.saveCart(cart);
    return changed;
  }

  /**
   * Sunucunun hesapladığı fiyatları sepete uygular.
   *
   * Sipariş oluşturma `409 price_changed` döndüğünde istemci bu metodu çağırır:
   * aksi hâlde sepet, sunucunun artık kabul etmediği eski tutarı göstermeye
   * devam eder ve müşteri her denemede aynı hataya çarpar. `index`, sipariş
   * isteğindeki `items` sırasıyla aynıdır (sunucu aynı sırayı döndürür).
   */
  async applyServerPrices(
    updates: {
      index: number;
      unitPrice: number;
      totalPrice: number;
      supportEnabled?: boolean;
      isPreorder?: boolean;
      preorderDiscountPercent?: number | null;
      estimatedRestockDays?: number | null;
      quantityDiscount?: number | null;
      quantityDiscountPercent?: number | null;
      /** Adetten bağımsız fiyat modeli; saklanır, adet değişiminde kullanılır. */
      priceModel?: LinePriceModel | null;
    }[]
  ): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const cart = this.getCart();
    let applied = false;

    for (const update of updates) {
      const item = cart.items[update.index];
      if (!item) continue;

      // `pricingPending` her durumda kapanır; aksi halde fiyat değişmese bile
      // satırda "Hesaplanıyor" kalır.
      const wasPending = item.pricingPending === true;

      const changed =
        wasPending ||
        (update.priceModel != null && !samePriceModel(item.priceModel, update.priceModel)) ||
        item.unitPrice !== update.unitPrice ||
        item.totalPrice !== update.totalPrice ||
        (typeof update.supportEnabled === 'boolean' &&
          item.supportEnabled !== update.supportEnabled) ||
        (typeof update.isPreorder === 'boolean' && item.isPreorder !== update.isPreorder) ||
        (update.preorderDiscountPercent !== undefined &&
          (item.preorderDiscountPercent ?? null) !== (update.preorderDiscountPercent ?? null)) ||
        (update.estimatedRestockDays !== undefined &&
          (item.estimatedRestockDays ?? undefined) !== (update.estimatedRestockDays ?? undefined)) ||
        (update.quantityDiscount !== undefined &&
          (item.quantityDiscount ?? 0) !== (update.quantityDiscount ?? 0)) ||
        (update.quantityDiscountPercent !== undefined &&
          (item.quantityDiscountPercent ?? null) !== (update.quantityDiscountPercent ?? null));

      if (!changed) continue;

      item.unitPrice = update.unitPrice;
      item.totalPrice = update.totalPrice;
      item.pricingPending = false;
      if (typeof update.supportEnabled === 'boolean') {
        item.supportEnabled = update.supportEnabled;
      }
      if (typeof update.isPreorder === 'boolean') {
        item.isPreorder = update.isPreorder;
      }
      if (update.preorderDiscountPercent !== undefined) {
        item.preorderDiscountPercent = update.preorderDiscountPercent ?? null;
      }
      if (update.estimatedRestockDays !== undefined) {
        item.estimatedRestockDays = update.estimatedRestockDays ?? undefined;
      }
      if (update.quantityDiscount !== undefined) {
        item.quantityDiscount = update.quantityDiscount ?? 0;
      }
      if (update.quantityDiscountPercent !== undefined) {
        item.quantityDiscountPercent = update.quantityDiscountPercent ?? null;
      }
      if (update.priceModel != null) {
        item.priceModel = update.priceModel;
      }
      applied = true;
    }

    if (!applied) return false;

    // Yalnızca gerçek bir değişiklikte yaz: `saveCart` `cart-updated` olayı
    // yayar ve sepet sayfası bu olayda fiyat tazelemesini tekrar çalıştırır.
    // Koşulsuz yazmak sonsuz döngü üretirdi.
    this.saveCart(cart);
    await this.syncCartToDb(cart);
    return true;
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const userId = this.getCurrentUserId();
      const storageKey = this.getStorageKey(userId || undefined);
      localStorage.removeItem(storageKey);

      window.dispatchEvent(new CustomEvent('cart-cleared'));
    } catch (error) {
      console.error('[CartService] Failed to clear cart:', error);
    }

    await this.clearCartFromDb();
  }

  async clearCart(): Promise<void> {
    await this.clear();
  }

  getTotalPrice(): number {
    const cart = this.getCart();
    return cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  getTotalItems(): number {
    const cart = this.getCart();
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  private saveCart(cart: Cart): void {
    if (typeof window === 'undefined') return;

    const userId = this.getCurrentUserId();
    const storageKey = this.getStorageKey(userId || undefined);

    cart.userId = userId || undefined;
    cart.totalPrice = this.calculateTotal(cart.items);
    cart.totalItems = this.calculateItemCount(cart.items);
    cart.updatedAt = new Date().toISOString();
    cart.version = (cart.version || 0) + 1;

    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
    } catch (error) {
      console.error('[CartService] Failed to save cart:', error);
    }
  }

  private enqueueSync(syncFn: () => Promise<void>): void {
    this.pendingSync = syncFn;
    if (!this.syncInProgress) {
      this.syncInProgress = true;
      setTimeout(async () => {
        try {
          while (this.pendingSync) {
            const fn = this.pendingSync;
            this.pendingSync = null;
            await fn();
          }
        } finally {
          this.syncInProgress = false;
        }
      }, 50);
    }
  }

  private async getOrCreateCartDb(userId: string): Promise<string | null> {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: existing } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) return existing.id;

      const { data: newCart, error } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .single();

      if (error || !newCart) return null;
      return newCart.id;
    } catch (error) {
      console.error('[CartService] Failed to get/create cart in DB:', error);
      return null;
    }
  }

  private async syncCartToDb(cart: Cart): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    if (cart.items.length === 0) {
      await this.clearCartFromDb();
      return;
    }

    try {
      const cartId = await this.getOrCreateCartDb(userId);
      if (!cartId) return;

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Use upsert pattern instead of delete+re-insert to prevent race conditions
      const currentVersion = cart.version || 0;

      // Migration 097 uygulanmadıysa `support_enabled` seçimi hata verir; bu
      // durumda kolonsuz okumaya düşülür (seçim localStorage'da kalır).
      const readExisting = (columns: string) =>
        (supabase.from('cart_items') as any)
          .select(columns)
          .eq('cart_id', cartId);

      const firstRead = await readExisting(
        'id, cart_version, file_id, material_id, print_setting_id, support_enabled'
      );
      let existingItems = firstRead.data;
      if (firstRead.error && isMissingColumnError(firstRead.error, 'support_enabled')) {
        ({ data: existingItems } = await readExisting(
          'id, cart_version, file_id, material_id, print_setting_id'
        ));
      }

      // Destek seçimi fiyatı değiştirdiği için satır anahtarının parçasıdır;
      // aksi halde "destekli" ve "desteksiz" iki kalem birbirini ezer.
      const cartKey = (
        fileId: string | null,
        materialId: string | null,
        printSettingId: string | null,
        supportEnabled: unknown
      ) => `${fileId}_${materialId}_${printSettingId}_${supportEnabled !== false ? 1 : 0}`;

      const incomingKeys = new Set(
        cart.items.map(i => cartKey(i.fileId, i.materialId, i.printSettingId, i.supportEnabled))
      );

      const itemsToDelete = (existingItems || [])
        .filter((ei: any) =>
          !incomingKeys.has(
            cartKey(ei.file_id, ei.material_id, ei.print_setting_id, ei.support_enabled)
          )
        )
        .map((ei: any) => ei.id);

      if (itemsToDelete.length > 0) {
        await supabase.from('cart_items').delete().in('id', itemsToDelete);
      }

      for (const item of cart.items) {
        const matchKey = cartKey(
          item.fileId,
          item.materialId,
          item.printSettingId,
          item.supportEnabled
        );
        const existingMatch = (existingItems || []).find(
          (ei: any) =>
            cartKey(ei.file_id, ei.material_id, ei.print_setting_id, ei.support_enabled) === matchKey
        );

        const dbItem: Record<string, any> = {
          cart_id: cartId,
          cart_version: currentVersion,
          file_id: item.fileId || null,
          filename: item.fileName,
          volume_cm3: item.volumeCm3,
          material_id: item.materialId,
          material_name: item.materialName,
          print_setting_id: item.printSettingId,
          print_setting_name: item.printSettingName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          estimated_time: item.estimatedTime,
          technology: item.technology || null,
          color: item.color || null,
          nozzle_size_id: item.nozzleSizeId || null,
          nozzle_size_mm: item.nozzleSizeMm || null,
          support_enabled: item.supportEnabled !== false,
          is_preorder: item.isPreorder || false,
          preorder_discount_percent: item.preorderDiscountPercent || null,
          estimated_restock_days: item.estimatedRestockDays || 0,
          custom_layer_height: item.customLayerHeight || null,
          custom_infill_percentage: item.customInfillPercentage || null,
          custom_time_multiplier: item.customTimeMultiplier || null,
          custom_layer_thickness: item.customLayerThickness || null,
          custom_exposure_time: item.customExposureTime || null,
          delivery_days: item.deliveryDays || null,
        };

        const writeRow = async (payload: Record<string, any>) =>
          existingMatch
            ? (supabase.from('cart_items') as any).update(payload).eq('id', existingMatch.id)
            : (supabase.from('cart_items') as any).insert(payload);

        let { error: writeError } = await writeRow(dbItem);
        if (writeError && isMissingColumnError(writeError, 'support_enabled')) {
          // Migration 097 uygulanmadıysa kolonu düşür: sepet çalışmaya devam
          // etsin, destek seçimi localStorage'da kalır (varsayılan açık).
          delete dbItem.support_enabled;
          ({ error: writeError } = await writeRow(dbItem));
        }
        if (writeError) {
          console.error('[CartService] cart_items yazılamadı:', writeError);
        }
      }
    } catch (error) {
      console.error('[CartService] DB sync error:', error);
    }
  }

  private async clearCartFromDb(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!cart) return;

      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      await supabase
        .from('carts')
        .delete()
        .eq('id', cart.id);
    } catch (error) {
      console.error('[CartService] Failed to clear cart from DB:', error);
    }
  }

  async loadFromDb(): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!cart) return false;

      const { data: items } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cart.id)
        .order('created_at', { ascending: true });

      if (!items || items.length === 0) return false;

      // Filter out items referencing soft-deleted files
      const fileIds = items
        .map((i: any) => i.file_id)
        .filter((id: string | null): id is string => !!id);
      let activeFileIds = new Set<string>();
      if (fileIds.length > 0) {
        const { data: activeFiles } = await supabase
          .from('files')
          .select('id')
          .is('deleted_at', null)
          .in('id', fileIds);
        activeFileIds = new Set((activeFiles || []).map((f: any) => f.id));
      }
      const filteredItems = items.filter(
        (i: any) => !i.file_id || activeFileIds.has(i.file_id)
      );

      if (filteredItems.length === 0) {
        // All items reference deleted files — clear the cart
        await supabase.from('cart_items').delete().eq('cart_id', cart.id);
        return false;
      }

      const cartItems: CartItem[] = filteredItems.map((dbItem: any) => ({
        id: `db_${dbItem.id}`,
        fileId: dbItem.file_id || '',
        fileName: dbItem.filename,
        volumeCm3: dbItem.volume_cm3 || 0,
        materialId: dbItem.material_id,
        materialName: dbItem.material_name,
        printSettingId: dbItem.print_setting_id,
        printSettingName: dbItem.print_setting_name,
        quantity: dbItem.quantity,
        unitPrice: dbItem.unit_price,
        totalPrice: dbItem.total_price,
        estimatedTime: dbItem.estimated_time || 0,
        technology: dbItem.technology || undefined,
        color: dbItem.color || undefined,
        nozzleSizeId: dbItem.nozzle_size_id || undefined,
        nozzleSizeMm: dbItem.nozzle_size_mm || undefined,
        supportEnabled: dbItem.support_enabled !== false,
        isPreorder: dbItem.is_preorder || false,
        preorderDiscountPercent: dbItem.preorder_discount_percent || null,
        estimatedRestockDays: dbItem.estimated_restock_days || 0,
        customLayerHeight: dbItem.custom_layer_height || undefined,
        customInfillPercentage: dbItem.custom_infill_percentage || undefined,
        customTimeMultiplier: dbItem.custom_time_multiplier || undefined,
        customLayerThickness: dbItem.custom_layer_thickness || undefined,
        customExposureTime: dbItem.custom_exposure_time || undefined,
        deliveryDays: dbItem.delivery_days || undefined,
        addedAt: dbItem.created_at || new Date().toISOString(),
      }));

      const stored = this.getCart();
      const dbVersion = (items[0] as any)?.cart_version || 0;
      const localVersion = stored.version || 0;

      // Always prefer whichever has higher version
      if (localVersion === 0 && cartItems.length > 0) {
        stored.items = cartItems;
        this.saveCart(stored);
        return true;
      }

      if (dbVersion > localVersion && cartItems.length > 0) {
        stored.items = cartItems;
        this.saveCart(stored);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[CartService] Failed to load from DB:', error);
      return false;
    }
  }

  private calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  private calculateItemCount(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  private generateId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEmptyCart(): Cart {
    const userId = this.getCurrentUserId();
    return {
      userId: userId || undefined,
      items: [],
      totalPrice: 0,
      totalItems: 0,
      updatedAt: new Date().toISOString(),
      version: 0,
    };
  }
}

export const cartService = new CartService();
