/**
 * Quota Service
 * Axis3 - Upload Quota Management
 * 
 * Features:
 * - Check upload quota
 * - Calculate used/total quota
 * - Validate upload permission
 */

import { createClient } from '@/lib/supabase/client';

export interface QuotaInfo {
  used: number;
  total: number;
  remaining: number;
  canUpload: boolean;
  bonus: number;
  isUnlimited?: boolean;
}

export class QuotaService {
  private supabase = createClient();

  /**
   * Get quota information for user
   */
  async getQuotaInfo(userId: string): Promise<{ success: boolean; quota?: QuotaInfo; error?: string }> {
    try {
      // Check if user is @axis3.com.tr (unlimited quota)
      const { data: { user } } = await (this.supabase as any).auth.getUser();
      if (user?.email?.endsWith('@axis3.com.tr')) {
        return {
          success: true,
          quota: {
            used: 0,
            total: Infinity,
            remaining: Infinity,
            canUpload: true,
            bonus: 0,
            isUnlimited: true,
          },
        };
      }

      // Get used quota
      const { data: usedData, error: usedError } = await (this.supabase as any)
        .rpc('calculate_upload_quota_used', { user_uuid: userId });

      if (usedError) {
        console.error('Failed to calculate used quota:', usedError);
        return { success: false, error: 'Kota bilgisi alınamadı' };
      }

      // Get total quota
      const { data: totalData, error: totalError } = await (this.supabase as any)
        .rpc('calculate_total_quota', { user_uuid: userId });

      if (totalError) {
        console.error('Failed to calculate total quota:', totalError);
        return { success: false, error: 'Kota bilgisi alınamadı' };
      }

      // Get bonus quota
      const { data: userData } = await (this.supabase.from('users') as any)
        .select('upload_quota_bonus')
        .eq('id', userId)
        .single();

      const bonus = (userData as any)?.upload_quota_bonus || 0;

      const used = usedData || 0;
      const total = totalData || 3;
      const remaining = Math.max(0, total - used);

      return {
        success: true,
        quota: {
          used,
          total,
          remaining,
          canUpload: remaining > 0,
          bonus,
        },
      };
    } catch (error) {
      console.error('Get quota info error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Check if user can upload
   */
  async canUpload(userId: string): Promise<boolean> {
    try {
      const { data, error } = await (this.supabase as any)
        .rpc('can_user_upload', { user_uuid: userId });

      if (error) {
        console.error('Failed to check upload permission:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Can upload error:', error);
      return false;
    }
  }

  /**
   * Get quota breakdown (for display)
   */
  getQuotaBreakdown(quota: QuotaInfo): {
    base: number;
    fromOrders: number;
    bonus: number;
  } {
    const base = 3;
    const bonus = quota.bonus;
    const fromOrders = quota.total - base - bonus;

    return {
      base,
      fromOrders: Math.max(0, fromOrders),
      bonus,
    };
  }
}

// Singleton export
export const quotaService = new QuotaService();
