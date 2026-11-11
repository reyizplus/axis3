/**
 * Admin Service
 * Centralized admin operations for settings and material management
 * RBAC enforced at database level (RLS policies)
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

// Helper to get the appropriate Supabase client based on environment
async function getSupabaseClient() {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    return createBrowserClient();
  }
  // Server environment
  return await createServerClient();
}

// ============================================================================
// TYPES
// ============================================================================

export interface GlobalSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  category: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Material {
  id: string;
  name: string;
  code: string;
  technology: 'FDM' | 'SLA';
  cost_per_gram: number;
  density: number;
  print_speed_modifier: number;
  colors: string[];
  description: string | null;
  is_active: boolean;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lead_time_days: number;
  preorder_allowed: boolean;
  preorder_discount_percent: number | null;
  created_at: string;
  updated_at: string;
}

export interface PrintSetting {
  id: string;
  name: string;
  code: string;
  technology: 'FDM' | 'SLA';
  layer_height: number | null;
  infill_percentage: number | null;
  print_speed: number | null;
  layer_thickness: number | null;
  exposure_time: number | null;
  time_multiplier: number;
  price_multiplier: number;
  quality_premium: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  requires_nozzle_size_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingAnalytics {
  totalCalculations: number;
  averagePrice: number;
  totalRevenue: number;
  popularMaterials: Array<{ material: string; count: number }>;
  recentCalculations: Array<{
    id: string;
    material: string;
    quality: string;
    price: number;
    created_at: string;
  }>;
}

// ============================================================================
// ADMIN SERVICE CLASS
// ============================================================================

class AdminService {
  private static instance: AdminService;

  private constructor() {}

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // ==========================================================================
  // GLOBAL SETTINGS OPERATIONS
  // ==========================================================================

  /**
   * Get all global settings
   */
  async getGlobalSettings(): Promise<GlobalSetting[]> {
    const supabase = await getSupabaseClient();
    
    const { data, error } = await (supabase
      .from('global_settings')
      .select('*') as any)
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      console.error('[AdminService] Error fetching global settings:', error);
      throw new Error(`Failed to fetch global settings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific global setting by key
   */
  async getGlobalSetting(key: string): Promise<GlobalSetting | null> {
    const supabase = await getSupabaseClient();
    
    const { data, error } = await (supabase
      .from('global_settings')
      .select('*') as any)
      .eq('key', key)
      .single();

    if (error) {
      console.error('[AdminService] Error fetching global setting:', error);
      return null;
    }

    return data;
  }

  /**
   * Update a global setting
   */
  async updateGlobalSetting(
    key: string,
    value: Record<string, unknown>
  ): Promise<GlobalSetting> {
    const supabase = await getSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('global_settings')
      .update({
        value,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('key', key)
      .select()
      .single();

    if (error) {
      console.error('[AdminService] Error updating global setting:', error);
      throw new Error(`Failed to update global setting: ${error.message}`);
    }

    return data;
  }

  // ==========================================================================
  // MATERIAL OPERATIONS
  // ==========================================================================

  /**
   * Get all materials
   */
  async getMaterials(includeInactive = false): Promise<Material[]> {
    const supabase = await getSupabaseClient();
    
    let query: any = (supabase
      .from('materials')
      .select('*') as any)
      .order('technology', { ascending: true })
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AdminService] Error fetching materials:', error);
      throw new Error(`Failed to fetch materials: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific material by ID
   */
  async getMaterial(id: string): Promise<Material | null> {
    const supabase = await getSupabaseClient();
    
    const { data, error } = await (supabase
      .from('materials')
      .select('*') as any)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[AdminService] Error fetching material:', error);
      return null;
    }

    return data;
  }

  /**
   * Create a new material
   */
  async createMaterial(material: Omit<Material, 'id' | 'created_at' | 'updated_at'>): Promise<Material> {
    const supabase = await getSupabaseClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('materials') as any)
      .insert(material)
      .select()
      .single();

    if (error) {
      console.error('[AdminService] Error creating material:', error);
      throw new Error(`Failed to create material: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a material
   */
  async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const supabase = await getSupabaseClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('materials')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AdminService] Error updating material:', error);
      throw new Error(`Failed to update material: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a material (soft delete by setting is_active to false)
   */
  async deleteMaterial(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { error } = await (supabase as any)
      .from('materials')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (error) {
      console.error('[AdminService] Error deleting material:', error);
      throw new Error(`Failed to delete material: ${error.message}`);
    }
  }

  // ==========================================================================
  // PRINT SETTINGS OPERATIONS
  // ==========================================================================

  /**
   * Get all print settings
   */
  async getPrintSettings(includeInactive = false): Promise<PrintSetting[]> {
    const supabase = await getSupabaseClient();
    
    let query: any = (supabase
      .from('print_settings')
      .select('*') as any)
      .order('technology', { ascending: true })
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AdminService] Error fetching print settings:', error);
      throw new Error(`Failed to fetch print settings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update a print setting
   */
  async updatePrintSetting(id: string, updates: Partial<PrintSetting>): Promise<PrintSetting> {
    const supabase = await getSupabaseClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('print_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AdminService] Error updating print setting:', error);
      throw new Error(`Failed to update print setting: ${error.message}`);
    }

    return data;
  }

  // ==========================================================================
  // PRICING ANALYTICS
  // ==========================================================================

  /**
   * Get pricing analytics
   */
  async getPricingAnalytics(): Promise<PricingAnalytics> {
    const supabase = await getSupabaseClient();
    
    // Get recent calculations
    const { data: recentData, error: recentError } = await (supabase
      .from('pricing_history')
      .select('id, calculated_price, created_at, price_breakdown') as any)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('[AdminService] Error fetching recent calculations:', recentError);
    }

    // Calculate basic analytics
    const totalCalculations = recentData?.length || 0;
    const averagePrice = totalCalculations > 0
      ? recentData!.reduce((sum: number, item: { calculated_price?: number }) => sum + (item.calculated_price || 0), 0) / totalCalculations
      : 0;
    const totalRevenue = recentData?.reduce((sum: number, item: { calculated_price?: number }) => sum + (item.calculated_price || 0), 0) || 0;

    return {
      totalCalculations,
      averagePrice,
      totalRevenue,
      popularMaterials: [], // TODO: Implement material popularity tracking
      recentCalculations: recentData || [],
    };
  }

  // ==========================================================================
  // RBAC HELPERS
  // ==========================================================================

  /**
   * Check if current user is admin
   * Uses database is_admin() function which checks:
   * 1. raw_user_meta_data->>'role' = 'admin'
   * 2. email LIKE '%@axis3.com.tr'
   */
  async isAdmin(): Promise<boolean> {
    const supabase = await getSupabaseClient();
    
        const { data: { user }, error: userError } = await supabase.auth.getUser();
    
        if (userError) {
      console.error('[AdminService] Error getting user:', userError);
      return false;
    }
    
    if (!user) {
            return false;
    }

    // Use database is_admin() function via RPC
        const { data, error } = await supabase.rpc('is_admin');
    
        if (error) {
      console.error('[AdminService] Error checking admin status:', error);
      return false;
    }

    const isAdmin = data === true;
        return isAdmin;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const adminService = AdminService.getInstance();
