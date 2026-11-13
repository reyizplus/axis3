import { createClient } from '@/lib/supabase/client';

export interface NozzleSize {
  id: string;
  size_mm: number;
  display_name: string;
  compatible_technology: 'FDM' | 'SLA';
  is_active: boolean;
  sort_order: number;
}

export interface InventoryItem {
  id: string;
  type: 'filament' | 'nozzle' | 'resin' | 'other';
  name: string;
  sku: string | null;
  quantity_on_hand: number;
  minimum_stock: number;
  unit_cost: number | null;
  is_active: boolean;
  description: string | null;
  material_id: string | null;
  color: string | null;
  hex_color: string | null;
  spool_weight_grams: number | null;
  nozzle_size_id: string | null;
  allow_preorder: boolean;
  preorder_discount_percent: number | null;
  estimated_restock_days: number;
  material?: { name: string; code: string } | null;
  nozzle_size?: NozzleSize | null;
}

export interface PreorderInfo {
  allowed: boolean;
  discountPercent: number;
  originalPrice: number;
  finalPrice: number;
  restockDays: number;
}

class InventoryService {
  private supabase = createClient();

  async getNozzleSizes(technology?: string): Promise<NozzleSize[]> {
    let query = (this.supabase
      .from('nozzle_sizes')
      .select('*') as any)
      .eq('is_active', true);
    if (technology) {
      query = query.eq('compatible_technology', technology);
    }
    const { data } = await query.order('sort_order');
    return (data as unknown as NozzleSize[]) || [];
  }

  async getAllNozzleSizes(): Promise<NozzleSize[]> {
    const { data } = await this.supabase
      .from('nozzle_sizes')
      .select('*')
      .order('sort_order') as any;
    return (data as unknown as NozzleSize[]) || [];
  }

  async createNozzleSize(input: Partial<NozzleSize>): Promise<NozzleSize> {
    const { data } = await (this.supabase
      .from('nozzle_sizes')
      .insert(input as any)
      .select()
      .single());
    return data as unknown as NozzleSize;
  }

  async updateNozzleSize(id: string, input: Partial<NozzleSize>): Promise<void> {
    await (this.supabase.from('nozzle_sizes') as any).update(input as any).eq('id', id);
  }

  async deleteNozzleSize(id: string): Promise<void> {
    await (this.supabase.from('nozzle_sizes') as any).delete().eq('id', id);
  }

  async getInventoryItems(type?: string): Promise<InventoryItem[]> {
    let query = this.supabase
      .from('inventory_items')
      .select('*, material:materials(name, code), nozzle_size:nozzle_sizes(*)') as any;
    if (type) query = query.eq('type', type);
    const { data } = await query.order('name');
    return (data as unknown as InventoryItem[]) || [];
  }

  async getAvailableColors(materialId: string, technology?: 'FDM' | 'SLA'): Promise<{ color: string; hex_color: string | null; inStock: boolean; preorderInfo: { allowed: boolean; discountPercent: number | null; restockDays: number } }[]> {
    if (!technology) {
      const { data: mat } = await ((this.supabase
        .from('materials') as any)
        .select('technology')
        .eq('id', materialId)
        .single()) as { data: { technology: string } | null; error: any };
      technology = (mat?.technology || 'FDM') as 'FDM' | 'SLA';
    }

    const { data } = await (this.supabase
      .from('inventory_items')
      .select('color, hex_color, quantity_on_hand, allow_preorder, preorder_discount_percent, estimated_restock_days') as any)
      .eq('type', technology === 'SLA' ? 'resin' : 'filament')
      .eq('material_id', materialId)
      .eq('is_active', true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (data || []) as any[];
    const colorMap = new Map<string, { hex: string | null; totalStock: number; preorderAllowed: boolean; discountPercent: number | null; restockDays: number }>();

    for (const item of items) {
      if (!item.color) continue;
      const existing = colorMap.get(item.color);
      if (existing) {
        existing.totalStock += item.quantity_on_hand;
      } else {
        colorMap.set(item.color, {
          hex: item.hex_color,
          totalStock: item.quantity_on_hand,
          preorderAllowed: item.allow_preorder,
          discountPercent: item.preorder_discount_percent,
          restockDays: item.estimated_restock_days,
        });
      }
    }

    return Array.from(colorMap.entries()).map(([color, info]) => ({
      color,
      hex_color: info.hex,
      inStock: info.totalStock > 0,
      preorderInfo: {
        allowed: info.preorderAllowed,
        discountPercent: info.discountPercent,
        restockDays: info.restockDays,
      },
    }));
  }

  async getAvailableNozzleSizeIds(): Promise<Set<string>> {
    const { data } = await (this.supabase
      .from('inventory_items')
      .select('nozzle_size_id') as any)
      .eq('type', 'nozzle')
      .eq('is_active', true)
      .gt('quantity_on_hand', 0);

    const ids = new Set<string>();
    (data || []).forEach((item: { nozzle_size_id?: string }) => {
      if (item.nozzle_size_id) ids.add(item.nozzle_size_id);
    });
    return ids;
  }

  async checkNozzleStock(nozzleSizeId: string): Promise<{ inStock: boolean; preorderAllowed: boolean; restockDays: number }> {
    const { data } = await (this.supabase
      .from('inventory_items')
      .select('quantity_on_hand, allow_preorder, estimated_restock_days') as any)
      .eq('type', 'nozzle')
      .eq('nozzle_size_id', nozzleSizeId)
      .eq('is_active', true)
      .maybeSingle();

    if (!data) return { inStock: false, preorderAllowed: false, restockDays: 14 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = data as any;
    return {
      inStock: item.quantity_on_hand > 0,
      preorderAllowed: item.allow_preorder,
      restockDays: item.estimated_restock_days,
    };
  }

  async getGlobalPreorderDiscount(): Promise<number> {
    const { data } = await (this.supabase
      .from('global_settings')
      .select('value') as any)
      .eq('key', 'default_preorder_discount_percent')
      .single();
    if (!data) return 10;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data as any).value as { value: number }).value || 10;
  }

  async isPreorderEnabled(): Promise<boolean> {
    const { data } = await (this.supabase
      .from('global_settings')
      .select('value') as any)
      .eq('key', 'preorder_enabled')
      .single();
    if (!data) return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!((data as any).value as { value: boolean }).value;
  }

  async calculatePreorderPrice(basePrice: number, discountPercent?: number | null): Promise<{ originalPrice: number; finalPrice: number; discountPercent: number }> {
    const globalDiscount = await this.getGlobalPreorderDiscount();
    const effectiveDiscount = discountPercent ?? globalDiscount;
    const discount = Math.min(Math.max(effectiveDiscount, 0), 100);
    return {
      originalPrice: basePrice,
      finalPrice: basePrice * (1 - discount / 100),
      discountPercent: discount,
    };
  }

  async createInventoryItem(input: Partial<InventoryItem>): Promise<InventoryItem> {
    const { data } = await (this.supabase
      .from('inventory_items')
      .insert(input as any)
      .select()
      .single());
    return data as unknown as InventoryItem;
  }

  async updateInventoryItem(id: string, input: Partial<InventoryItem>): Promise<void> {
    await (this.supabase.from('inventory_items') as any).update(input as any).eq('id', id);
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await (this.supabase.from('inventory_items') as any).delete().eq('id', id);
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const { data } = await (this.supabase
      .from('inventory_items')
      .select('*, material:materials(name, code)') as any)
      .eq('is_active', true);
    return ((data || []) as unknown as InventoryItem[]).filter(item => item.quantity_on_hand <= item.minimum_stock);
  }

  async checkMaterialAvailability(materialId: string, color?: string, _nozzleSizeId?: string, technology?: 'FDM' | 'SLA'): Promise<{
    available: boolean;
    stockCount: number;
    canPreorder: boolean;
    preorderDiscountPercent: number | null;
    estimatedRestockDays: number;
    availableColors: { color: string; hex: string | null; inStock: boolean }[];
  }> {
    if (!technology) {
      const { data: mat } = await ((this.supabase
        .from('materials') as any)
        .select('technology')
        .eq('id', materialId)
        .single()) as { data: { technology: string } | null; error: any };
      technology = (mat?.technology || 'FDM') as 'FDM' | 'SLA';
    }
    const [invData, matData, preorderSetting, preorderDefault] = await Promise.all([
      (this.supabase
        .from('inventory_items')
        .select('*') as any)
        .eq('type', technology === 'SLA' ? 'resin' : 'filament')
        .eq('material_id', materialId)
        .eq('is_active', true),
      (this.supabase
        .from('materials') as any)
        .select('preorder_allowed, preorder_discount_percent')
        .eq('id', materialId)
        .single(),
      (this.supabase
        .from('global_settings') as any)
        .select('value')
        .eq('key', 'preorder_enabled')
        .maybeSingle(),
      (this.supabase
        .from('global_settings') as any)
        .select('value')
        .eq('key', 'default_preorder_discount_percent')
        .maybeSingle(),
    ]);
    const items = (invData.data as unknown as InventoryItem[]) || [];
    const materialPreorderAllowed = (matData.data as any)?.preorder_allowed ?? false;
    const materialPreorderDiscount = (matData.data as any)?.preorder_discount_percent ?? null;
    const preorderGloballyEnabled = (preorderSetting.data as any)?.value?.value !== false;
    const defaultPreorderDiscount = Number((preorderDefault.data as any)?.value?.value ?? 0);

    // Aggregate by color
    const colorMap = new Map<string, { hex: string | null; qty: number; canPreorder: boolean; preorderDiscount: number | null; restock: number }>();
    const NO_COLOR_KEY = '__no_color__';

    for (const item of items) {
      const colorKey = item.color || NO_COLOR_KEY;
      const existing = colorMap.get(colorKey);
      if (existing) {
        existing.qty += item.quantity_on_hand;
      } else {
        colorMap.set(colorKey, {
          hex: item.hex_color,
          qty: item.quantity_on_hand,
          canPreorder: item.allow_preorder ?? materialPreorderAllowed,
          preorderDiscount:
            item.preorder_discount_percent ??
            materialPreorderDiscount ??
            (preorderGloballyEnabled ? defaultPreorderDiscount : null),
          restock: item.estimated_restock_days,
        });
      }
    }

    const availableColors = Array.from(colorMap.entries())
      .filter(([key]) => key !== NO_COLOR_KEY)
      .map(([color, info]) => ({
        color,
        hex: info.hex,
        inStock: info.qty > 0,
      }));

    // Check requested color
    let stockCount = 0;
    let canPreorder = false;
    let preorderDiscountPercent: number | null = null;
    let estimatedRestockDays = 14;

    if (color) {
      const colorInfo = colorMap.get(color);
      if (colorInfo) {
        stockCount = colorInfo.qty;
        canPreorder = colorInfo.canPreorder;
        preorderDiscountPercent = colorInfo.preorderDiscount;
        estimatedRestockDays = colorInfo.restock;
      } else {
        canPreorder = materialPreorderAllowed;
        preorderDiscountPercent = materialPreorderDiscount;
      }
    } else {
      for (const [, info] of colorMap) {
        stockCount += info.qty;
        if (info.canPreorder) canPreorder = true;
        if (info.preorderDiscount !== null) preorderDiscountPercent = info.preorderDiscount;
      }
      if (colorMap.size === 0) {
        canPreorder = materialPreorderAllowed;
        preorderDiscountPercent = materialPreorderDiscount;
      }
    }

    if (!preorderGloballyEnabled) {
      canPreorder = false;
      preorderDiscountPercent = null;
    } else if (canPreorder && preorderDiscountPercent == null) {
      preorderDiscountPercent = defaultPreorderDiscount;
    }

    return {
      available: stockCount > 0,
      stockCount,
      canPreorder,
      preorderDiscountPercent,
      estimatedRestockDays,
      availableColors,
    };
  }

  async deductStock(materialId: string, color: string, quantity: number, nozzleSizeId?: string, technology?: 'FDM' | 'SLA'): Promise<void> {
    if (!technology) {
      const { data: mat } = await ((this.supabase
        .from('materials') as any)
        .select('technology')
        .eq('id', materialId)
        .single()) as { data: { technology: string } | null; error: any };
      technology = (mat?.technology || 'FDM') as 'FDM' | 'SLA';
    }

    const { data, error } = await (this.supabase.rpc as any)('deduct_inventory_stock', {
      p_material_id: materialId,
      p_color: color,
      p_quantity: quantity,
      p_nozzle_size_id: nozzleSizeId || null,
      p_technology: technology,
    });

    if (error) {
      console.error(`[INVENTORY] Atomic deduct failed:`, error);
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const short = (data as any)?.short ?? 0;
    if (short > 0) {
      console.warn(`[INVENTORY] Not enough stock for material ${materialId}, color ${color}: ${short} units short`);
    }
  }
}

export const inventoryService = new InventoryService();
