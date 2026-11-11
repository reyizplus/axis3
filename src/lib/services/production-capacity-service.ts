/**
 * Production Capacity Service
 * Manages production capacity settings and calculates intelligent delivery estimates
 */

import { createClient } from '@/lib/supabase/server';

export interface ProductionCapacitySettings {
  machine_count: number;
  buffer_time_hours: number;
  working_hours_per_day: number;
  working_days_per_week: number;
}

export class ProductionCapacityService {
  /**
   * Get production capacity settings from system_settings
   */
  async getSettings(): Promise<ProductionCapacitySettings> {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from('system_settings')
        .select('value')
        .eq('key', 'production_capacity')
        .single();

      if (error) {
        console.error('Failed to fetch production capacity settings:', error);
        return this.getDefaultSettings();
      }

      const typedData = data as any;
      if (!typedData || !typedData.value) {
        return this.getDefaultSettings();
      }

      return typedData.value as ProductionCapacitySettings;
    } catch (error) {
      console.error('Error in getSettings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update production capacity settings
   */
  async updateSettings(settings: ProductionCapacitySettings): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate settings
      if (settings.machine_count < 1) {
        return { success: false, error: 'Makine sayısı en az 1 olmalıdır' };
      }

      if (settings.working_hours_per_day < 1 || settings.working_hours_per_day > 24) {
        return { success: false, error: 'Günlük çalışma saati 1-24 arasında olmalıdır' };
      }

      if (settings.working_days_per_week < 1 || settings.working_days_per_week > 7) {
        return { success: false, error: 'Haftalık çalışma günü 1-7 arasında olmalıdır' };
      }

      if (settings.buffer_time_hours < 0) {
        return { success: false, error: 'Buffer süresi negatif olamaz' };
      }

      const supabase = await createClient();
      const { error } = await (supabase as any)
        .from('system_settings')
        .update({
          value: settings,
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'production_capacity');

      if (error) {
        console.error('Failed to update production capacity settings:', error);
        return { success: false, error: 'Ayarlar güncellenemedi' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateSettings:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Get total production queue hours from paid orders
   * Only counts orders that are in production stages (payment_received, preparing, printing)
   */
  async getTotalQueueHours(): Promise<number> {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from('order_items')
        .select('estimated_print_hours, orders!inner(payment_status, status)')
        .in('orders.status', ['payment_received', 'preparing', 'printing'])
        .eq('orders.payment_status', 'paid')
        .not('estimated_print_hours', 'is', null);

      if (error) {
        console.error('Failed to fetch queue hours:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      // Sum all estimated print hours
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalHours = data.reduce((sum: number, item: any) => {
        return sum + (Number(item.estimated_print_hours) || 0);
      }, 0);

      return totalHours;
    } catch (error) {
      console.error('Error in getTotalQueueHours:', error);
      return 0;
    }
  }

  /**
   * Calculate estimated delivery date based on print hours and current queue
   * @param printHours - Total print hours for the new order
   * @returns Estimated delivery date
   */
  async calculateEstimatedDelivery(printHours: number): Promise<Date> {
    try {
      // Get settings
      const settings = await this.getSettings();

      // Get current queue
      const queueHours = await this.getTotalQueueHours();

      // Total hours = queue + new order + buffer
      const totalHours = queueHours + printHours + settings.buffer_time_hours;

      // Calculate parallel production time (divide by machine count)
      const parallelHours = totalHours / settings.machine_count;

      // Convert to working days
      const workingDays = Math.ceil(parallelHours / settings.working_hours_per_day);

      // Calculate calendar days (accounting for weekends)
      const calendarDays = this.calculateCalendarDays(workingDays, settings.working_days_per_week);

      // Add to current date
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + calendarDays);

      return estimatedDate;
    } catch (error) {
      console.error('Error in calculateEstimatedDelivery:', error);
      // Fallback: 7 days from now
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 7);
      return fallbackDate;
    }
  }

  /**
   * Convert working days to calendar days accounting for weekends
   * @param workingDays - Number of working days needed
   * @param workingDaysPerWeek - Working days per week (e.g., 5 for Mon-Fri)
   * @returns Calendar days needed
   */
  private calculateCalendarDays(workingDays: number, workingDaysPerWeek: number): number {
    if (workingDaysPerWeek === 7) {
      // Working 7 days a week, no adjustment needed
      return workingDays;
    }

    // Calculate full weeks and remaining days
    const fullWeeks = Math.floor(workingDays / workingDaysPerWeek);
    const remainingDays = workingDays % workingDaysPerWeek;

    // Calendar days = (full weeks * 7) + remaining working days + weekend days in partial week
    const weekendDaysPerWeek = 7 - workingDaysPerWeek;
    const calendarDays = (fullWeeks * 7) + remainingDays + (fullWeeks * weekendDaysPerWeek);

    // Add extra days if remaining days would span into weekend
    const extraDays = remainingDays > 0 ? Math.ceil((remainingDays / workingDaysPerWeek) * weekendDaysPerWeek) : 0;

    return calendarDays + extraDays;
  }

  /**
   * Get default production capacity settings
   */
  private getDefaultSettings(): ProductionCapacitySettings {
    return {
      machine_count: 3,
      buffer_time_hours: 2,
      working_hours_per_day: 8,
      working_days_per_week: 5,
    };
  }

  /**
   * Format estimated delivery date to YYYY-MM-DD string
   */
  formatDeliveryDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get production capacity statistics
   */
  async getStatistics(): Promise<{
    totalQueueHours: number;
    estimatedQueueDays: number;
    machineCount: number;
    utilizationPercentage: number;
  }> {
    try {
      const settings = await this.getSettings();
      const queueHours = await this.getTotalQueueHours();

      // Calculate how many days the current queue will take
      const parallelHours = queueHours / settings.machine_count;
      const queueDays = Math.ceil(parallelHours / settings.working_hours_per_day);

      // Calculate utilization (assuming 1 week = 100% capacity)
      const weekCapacity = settings.machine_count * settings.working_hours_per_day * settings.working_days_per_week;
      const utilization = Math.min((queueHours / weekCapacity) * 100, 100);

      return {
        totalQueueHours: Math.round(queueHours * 100) / 100,
        estimatedQueueDays: queueDays,
        machineCount: settings.machine_count,
        utilizationPercentage: Math.round(utilization),
      };
    } catch (error) {
      console.error('Error in getStatistics:', error);
      return {
        totalQueueHours: 0,
        estimatedQueueDays: 0,
        machineCount: 3,
        utilizationPercentage: 0,
      };
    }
  }
}

// Export singleton instance
export const productionCapacityService = new ProductionCapacityService();
