/**
 * Payment Gateway Service
 * Manages payment gateway configuration and availability
 */

import { createClient } from '@/lib/supabase/client';

export interface PaymentGateway {
  id: string;
  gateway_type: 'iyzico' | 'bank_transfer';
  display_name: string;
  description: string;
  is_enabled: boolean;
  display_order: number;
  icon_name: string;
  configuration: Record<string, unknown>;
  metadata: {
    badge?: string;
    badge_color?: string;
    processing_time?: string;
    features?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface EnabledGateway {
  id: string;
  gateway_type: string;
  display_name: string;
  description: string;
  display_order: number;
  icon_name: string;
  metadata: Record<string, unknown>;
}

class PaymentGatewayService {
  /**
   * Get all enabled payment gateways (public access)
   */
  async getEnabledGateways(): Promise<EnabledGateway[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .rpc('get_enabled_payment_gateways');
    
    if (error) {
      console.warn('[PaymentGateway] getEnabledGateways RPC failed:', error?.message || error);
      return [];
    }
    
    return (data as unknown as EnabledGateway[]) || [];
  }

  /**
   * Check if any payment gateway is enabled
   */
  async hasEnabledGateways(): Promise<boolean> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .rpc('has_enabled_payment_gateways');
    
    if (error) {
      console.error('Error checking enabled gateways:', error);
      return false;
    }
    
    return (data as unknown as boolean) || false;
  }

  /**
   * Get all payment gateways (admin only)
   */
  async getAllGateways(): Promise<PaymentGateway[]> {
    const supabase = createClient();
    
    const { data, error } = await (supabase
      .from('payment_gateways')
      .select('*') as any)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching all gateways:', error);
      throw new Error('Failed to fetch payment gateways');
    }
    
    return (data || []) as PaymentGateway[];
  }

  /**
   * Toggle gateway enabled status (admin only)
   */
  async toggleGateway(id: string, isEnabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { error } = await (supabase
        .from('payment_gateways') as any)
        .update({
          is_enabled: isEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      /* eslint-enable @typescript-eslint/no-explicit-any */
      
      if (error) {
        console.error('Error toggling gateway:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Exception toggling gateway:', error);
      return { success: false, error: 'Failed to toggle gateway' };
    }
  }

  /**
   * Update gateway configuration (admin only)
   */
  async updateGatewayConfig(
    id: string, 
    updates: Partial<Pick<PaymentGateway, 'display_name' | 'description' | 'display_order' | 'configuration' | 'metadata'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { error } = await (supabase
        .from('payment_gateways') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      /* eslint-enable @typescript-eslint/no-explicit-any */
      
      if (error) {
        console.error('Error updating gateway config:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Exception updating gateway config:', error);
      return { success: false, error: 'Failed to update gateway configuration' };
    }
  }

  /**
   * Reorder payment gateways (admin only)
   */
  async reorderGateways(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      // Update display_order for each gateway
      const updates = orderedIds.map((id, index) =>
        /* eslint-disable @typescript-eslint/no-explicit-any */
        (supabase
          .from('payment_gateways') as any)
          .update({
            display_order: index + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          /* eslint-enable @typescript-eslint/no-explicit-any */
      );
      
      await Promise.all(updates);
      
      return { success: true };
    } catch (error) {
      console.error('Exception reordering gateways:', error);
      return { success: false, error: 'Failed to reorder gateways' };
    }
  }

  /**
   * Validate gateway credentials (admin only)
   * Currently checks environment variables for iyzico
   */
  async validateGatewayCredentials(gatewayType: string): Promise<{ valid: boolean; message: string }> {
    if (gatewayType === 'iyzico') {
      // Check if iyzico environment variables are set
      try {
        const response = await fetch('/api/admin/payment-gateways/validate-iyzico', {
          method: 'POST',
        });
        
        const data = await response.json();
        return {
          valid: data.valid || false,
          message: data.message || 'Validation failed'
        };
      } catch {
        return {
          valid: false,
          message: 'Failed to validate credentials'
        };
      }
    }
    
    if (gatewayType === 'bank_transfer') {
      // Check if at least one bank account is active
      try {
        const supabase = createClient();
        const { data, error } = await (supabase
          .from('bank_accounts')
          .select('id') as any)
          .eq('is_active', true)
          .limit(1);
        
        if (error) {
          return {
            valid: false,
            message: 'Failed to check bank accounts'
          };
        }
        
        return {
          valid: (data?.length || 0) > 0,
          message: (data?.length || 0) > 0 
            ? 'Bank accounts configured' 
            : 'No active bank accounts found'
        };
      } catch {
        return {
          valid: false,
          message: 'Failed to validate bank accounts'
        };
      }
    }
    
    return {
      valid: false,
      message: 'Unknown gateway type'
    };
  }

  /**
   * Get gateway audit logs (admin only)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getGatewayLogs(gatewayId?: string, limit: number = 50): Promise<any[]> {
    try {
      const supabase = createClient();
      
      let query: any = (supabase
        .from('payment_gateway_logs')
        .select('*, gateway:payment_gateways(gateway_type, display_name)') as any)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (gatewayId) {
        query = query.eq('gateway_id', gatewayId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching gateway logs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception fetching gateway logs:', error);
      return [];
    }
  }

  /**
   * Send admin notification when no gateways are enabled
   */
  async notifyAdminNoGateways(orderId: string): Promise<void> {
    try {
      await fetch('/api/admin/notifications/no-payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
    } catch (error) {
      console.error('Failed to send admin notification:', error);
    }
  }
}

// Singleton instance
export const paymentGatewayService = new PaymentGatewayService();
