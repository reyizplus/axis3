import type { CartItem, Cart } from './types';

export type { CartItem } from './types';

const CART_STORAGE_PREFIX = 'axis3_cart_';
const CART_USER_KEY = 'axis3_cart_user';

export class CartService {
  private syncInProgress = false;
  private pendingSync: (() => Promise<void>) | null = null;

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
            cart.items[existingIndex].quantity += item.quantity;
            cart.items[existingIndex].totalPrice = cart.items[existingIndex].unitPrice * cart.items[existingIndex].quantity;
          } else {
            cart.items.push({ ...item });
          }
        }
        this.saveCart(cart);
        localStorage.removeItem(anonStorageKey);
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
           i.printSettingId === item.printSettingId
    );

    let newItem: CartItem;

    if (existingIndex >= 0) {
      const existing = cart.items[existingIndex];
      existing.quantity += item.quantity;
      existing.unitPrice = item.unitPrice;
      existing.totalPrice = existing.unitPrice * existing.quantity;
      newItem = existing;
    } else {
      newItem = {
        ...item,
        id: this.generateId(),
        addedAt: new Date().toISOString(),
      };
      cart.items.push(newItem);
    }

    this.saveCart(cart);
    this.enqueueSync(() => this.syncCartToDb(cart));
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
      item.totalPrice = item.unitPrice * quantity;
      this.saveCart(cart);
      this.enqueueSync(() => this.syncCartToDb(cart));
    }
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

      const { data: existingItems } = await supabase
        .from('cart_items')
        .select('id, cart_version, file_id, material_id, print_setting_id')
        .eq('cart_id', cartId);

      const existingIds = new Set((existingItems || []).map((i: any) => i.id));
      const incomingKeys = new Set(cart.items.map(i => `${i.fileId}_${i.materialId}_${i.printSettingId}`));

      const itemsToDelete = (existingItems || [])
        .filter((ei: any) => !incomingKeys.has(`${ei.file_id}_${ei.material_id}_${ei.print_setting_id}`))
        .map((ei: any) => ei.id);

      if (itemsToDelete.length > 0) {
        await supabase.from('cart_items').delete().in('id', itemsToDelete);
      }

      for (const item of cart.items) {
        const matchKey = `${item.fileId}_${item.materialId}_${item.printSettingId}`;
        const existingMatch = (existingItems || []).find(
          (ei: any) => `${ei.file_id}_${ei.material_id}_${ei.print_setting_id}` === matchKey
        );

        const dbItem = {
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

        if (existingMatch) {
          await supabase.from('cart_items').update(dbItem).eq('id', existingMatch.id);
        } else {
          await supabase.from('cart_items').insert(dbItem);
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
