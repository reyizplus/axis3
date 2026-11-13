/**
 * Delivery Calculator Utility
 * Axis3 - Centralized Delivery Time Calculation
 * 
 * Purpose:
 * - Calculate total delivery time based on cart items
 * - Consider production capacity (machine count, working hours)
 * - Apply buffer time for unexpected delays
 * - Add cargo/shipping days
 * 
 * Formula:
 * Total Delivery = Production Days + Buffer Days + Cargo Days
 * 
 * Production Days = Total Print Hours / Daily Capacity
 * Daily Capacity = Machine Count × Working Hours Per Day
 * Buffer Days = Production Days × Buffer Percentage
 */

import { createClient } from '@/lib/supabase/client';
import type { CartItem } from '@/lib/cart/types';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface ProductionCapacitySettings {
  machineCount: number;
  workingHoursPerDay: number;
  workingDaysPerWeek: number;
  bufferTimePercentage: number;
  cargoDays: number;
  defaultDeliveryDays: number;
}

export interface DeliveryCalculationResult {
  totalDays: number;
  breakdown: {
    totalPrintHours: number;
    dailyCapacity: number;
    productionDays: number;
    bufferDays: number;
    cargoDays: number;
  };
}

// =====================================================
// DELIVERY CALCULATOR CLASS
// =====================================================

export class DeliveryCalculator {
  private client: any = null;
  private cachedSettings: ProductionCapacitySettings | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * @param client Optional Supabase client. Required for server-side usage;
   *               falls back to the browser client when omitted.
   */
  constructor(client?: any) {
    this.client = client ?? null;
  }

  private get supabase(): any {
    if (!this.client) this.client = createClient();
    return this.client;
  }

  /**
   * Get production capacity settings from database
   * Uses caching to reduce database calls
   */
  async getProductionCapacitySettings(): Promise<ProductionCapacitySettings> {
    // Check cache
    const now = Date.now();
    if (this.cachedSettings && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedSettings;
    }

    try {
      const { data, error } = await (this.supabase as any)
        .from('system_settings')
        .select('value')
        .eq('key', 'production_capacity')
        .maybeSingle();

      if (error || !data) {
        console.warn('[DELIVERY-CALCULATOR] Failed to fetch production capacity, using defaults');
        return this.getDefaultSettings();
      }

      const settingsValue = (data as any).value;
      
      const settings: ProductionCapacitySettings = {
        machineCount: settingsValue?.machine_count || settingsValue?.machineCount || 3,
        workingHoursPerDay: settingsValue?.working_hours_per_day || settingsValue?.workingHoursPerDay || 8,
        workingDaysPerWeek: settingsValue?.working_days_per_week || settingsValue?.workingDaysPerWeek || 5,
        bufferTimePercentage: settingsValue?.buffer_time_percentage || settingsValue?.bufferTimePercentage || 20,
        cargoDays: settingsValue?.cargo_days || settingsValue?.cargoDays || 2,
        defaultDeliveryDays: settingsValue?.default_delivery_days || settingsValue?.defaultDeliveryDays || 3,
      };

      // Fallback: if defaultDeliveryDays is still default, try reading from global_settings.shipping_settings
      if (settings.defaultDeliveryDays === 3) {
        try {
          const { data: shippingData } = await (this.supabase as any)
            .from('global_settings')
            .select('value')
            .eq('key', 'shipping_settings')
            .maybeSingle();
          if (shippingData?.value?.defaultDeliveryDays) {
            settings.defaultDeliveryDays = shippingData.value.defaultDeliveryDays;
          }
        } catch {
          // silently fail — use current value
        }
      }

      // Update cache
      this.cachedSettings = settings;
      this.cacheTimestamp = now;

      return settings;
    } catch (error) {
      console.error('[DELIVERY-CALCULATOR] Error fetching settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Calculate total delivery days for cart items
   * Considers all items, quantities, and production capacity
   */
  async calculateDeliveryDays(cartItems: CartItem[]): Promise<DeliveryCalculationResult> {
    if (!cartItems || cartItems.length === 0) {
      return {
        totalDays: 0,
        breakdown: {
          totalPrintHours: 0,
          dailyCapacity: 0,
          productionDays: 0,
          bufferDays: 0,
          cargoDays: 0,
        },
      };
    }

    // Get production capacity settings
    const settings = await this.getProductionCapacitySettings();

    // 1. Calculate total print hours (sum of all items × quantity)
    const totalPrintHours = cartItems.reduce((sum, item) => {
      return sum + (item.estimatedTime * item.quantity);
    }, 0);

    // 2. Calculate daily production capacity (hours)
    const dailyCapacity = settings.machineCount * settings.workingHoursPerDay;

    // 3. Calculate production days needed
    const productionDays = Math.ceil(totalPrintHours / dailyCapacity);

    // 4. Calculate buffer days (for unexpected delays)
    const bufferDays = Math.ceil(productionDays * (settings.bufferTimePercentage / 100));

    // 5. Add cargo/shipping days
    const cargoDays = settings.cargoDays;

    // 6. Calculate total delivery days
    const totalDays = productionDays + bufferDays + cargoDays;

    return {
      totalDays,
      breakdown: {
        totalPrintHours: this.round(totalPrintHours, 2),
        dailyCapacity,
        productionDays,
        bufferDays,
        cargoDays,
      },
    };
  }

  /**
   * Calculate delivery days for a single item (used in pricing engine)
   * This is for individual item pricing, not cart-based
   */
  async calculateSingleItemDelivery(
    printTimeHours: number,
    technology: string
  ): Promise<number> {
    const settings = await this.getProductionCapacitySettings();

    // Base delivery time based on technology
    let baseDays = technology === 'SLA' ? 2 : 1;

    // Add extra days for long prints
    if (printTimeHours > 24) {
      baseDays += Math.ceil(printTimeHours / 24);
    }

    // Add cargo days
    return baseDays + settings.cargoDays;
  }

  /**
   * Get default settings (fallback)
   */
  private getDefaultSettings(): ProductionCapacitySettings {
    return {
      machineCount: 3,
      workingHoursPerDay: 8,
      workingDaysPerWeek: 5,
      bufferTimePercentage: 20,
      cargoDays: 2,
      defaultDeliveryDays: 3,
    };
  }

  /**
   * Round to specified decimal places
   */
  private round(value: number, precision: number = 2): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Get default delivery days for items without print time (e.g. store products)
   */
  async getDefaultDeliveryDays(): Promise<number> {
    const settings = await this.getProductionCapacitySettings();
    return settings.defaultDeliveryDays;
  }

  /**
   * Calculate estimated delivery date string (YYYY-MM-DD) for a set of items
   */
  async calculateEstimatedDeliveryDate(cartItems: CartItem[]): Promise<string> {
    const hasPrintItems = cartItems.some(item => (item.estimatedTime || 0) > 0);
    let totalDays: number;
    if (hasPrintItems) {
      const result = await this.calculateDeliveryDays(cartItems);
      totalDays = result.totalDays;
    } else {
      totalDays = await this.getDefaultDeliveryDays();
    }
    const d = new Date();
    d.setDate(d.getDate() + totalDays);
    return d.toISOString().split('T')[0];
  }

  /**
   * Clear cache (useful for testing or after settings update)
   */
  clearCache(): void {
    this.cachedSettings = null;
    this.cacheTimestamp = 0;
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const deliveryCalculator = new DeliveryCalculator();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Quick helper to calculate delivery days for cart items
 * @param cartItems - Array of cart items
 * @returns Total delivery days
 */
export async function calculateCartDeliveryDays(cartItems: CartItem[]): Promise<number> {
  const result = await deliveryCalculator.calculateDeliveryDays(cartItems);
  return result.totalDays;
}

/**
 * Get detailed delivery calculation breakdown
 * @param cartItems - Array of cart items
 * @returns Detailed calculation result
 */
export async function getDeliveryBreakdown(cartItems: CartItem[]): Promise<DeliveryCalculationResult> {
  return await deliveryCalculator.calculateDeliveryDays(cartItems);
}

/**
 * Get estimated delivery date string for cart items
 */
export async function getEstimatedDeliveryDate(cartItems: CartItem[]): Promise<string> {
  return await deliveryCalculator.calculateEstimatedDeliveryDate(cartItems);
}
