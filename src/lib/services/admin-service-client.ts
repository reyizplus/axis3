/**
 * Admin Service - Client Side
 * Client-only admin operations using browser Supabase client
 * Used in Client Components only
 */

import { createClient } from '@/lib/supabase/client';

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

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  category_id: string | null;
  author_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CLIENT ADMIN SERVICE
// ============================================================================

class AdminServiceClient {
  private static instance: AdminServiceClient;

  private constructor() {}

  static getInstance(): AdminServiceClient {
    if (!AdminServiceClient.instance) {
      AdminServiceClient.instance = new AdminServiceClient();
    }
    return AdminServiceClient.instance;
  }

  // ==========================================================================
  // GLOBAL SETTINGS
  // ==========================================================================

  async getGlobalSettings(): Promise<GlobalSetting[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('global_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) throw error;
    return (data as unknown as GlobalSetting[]) || [];
  }

  async getGlobalSetting(key: string): Promise<GlobalSetting | null> {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('global_settings')
      .select('*') as any)
      .eq('key', key)
      .single();

    if (error) throw error;
    return data as unknown as GlobalSetting;
  }

  async updateGlobalSetting(
    key: string,
    value: Record<string, unknown>,
    description?: string
  ): Promise<GlobalSetting> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('global_settings')
      .update({
        value,
        description,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;
    return data as GlobalSetting;
  }

  // ==========================================================================
  // MATERIALS
  // ==========================================================================

  async getMaterials(includeInactive = false): Promise<Material[]> {
    const supabase = createClient();
    let query = supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = (query as any).eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as Material[]) || [];
  }

  async getMaterial(id: string): Promise<Material | null> {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('materials') as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Material;
  }

  async createMaterial(material: Omit<Material, 'id' | 'created_at' | 'updated_at'>): Promise<Material> {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('materials')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(material as any)
      .select()
      .single());

    if (error) throw error;
    return data as unknown as Material;
  }

  async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const supabase = createClient();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data, error } = await (supabase as any)
      .from('materials')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (error) throw error;
    return data as Material;
  }

  async deleteMaterial(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase
      .from('materials') as any)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  // ==========================================================================
  // PRINT SETTINGS
  // ==========================================================================

  async getPrintSettings(includeInactive = false): Promise<PrintSetting[]> {
    const supabase = createClient();
    let query = supabase
      .from('print_settings')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = (query as any).eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as PrintSetting[]) || [];
  }

  async updatePrintSetting(id: string, updates: Partial<PrintSetting>): Promise<PrintSetting> {
    const supabase = createClient();
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

    if (error) throw error;
    return data as PrintSetting;
  }

  // ==========================================================================
  // BLOG CATEGORIES
  // ==========================================================================

  async getBlogCategories(includeInactive = false): Promise<BlogCategory[]> {
    const supabase = createClient();
    let query = supabase
      .from('blog_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = (query as any).eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as BlogCategory[]) || [];
  }

  async getBlogCategory(id: string): Promise<BlogCategory | null> {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('blog_categories') as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as BlogCategory;
  }

  async createBlogCategory(category: Omit<BlogCategory, 'id' | 'created_at' | 'updated_at'>): Promise<BlogCategory> {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('blog_categories')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(category as any)
      .select()
      .single());

    if (error) throw error;
    return data as unknown as BlogCategory;
  }

  async updateBlogCategory(id: string, updates: Partial<BlogCategory>): Promise<BlogCategory> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('blog_categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as BlogCategory;
  }

  async deleteBlogCategory(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase
      .from('blog_categories') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==========================================================================
  // BLOG POSTS
  // ==========================================================================

  async getBlogPosts(filters?: { status?: string; category_id?: string }): Promise<BlogPost[]> {
    const supabase = createClient();
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = (query as any).eq('status', filters.status);
    }

    if (filters?.category_id) {
      query = (query as any).eq('category_id', filters.category_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as BlogPost[]) || [];
  }

  async getBlogPost(id: string): Promise<BlogPost | null> {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('blog_posts') as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as BlogPost;
  }

  async createBlogPost(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'view_count'>): Promise<BlogPost> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await (supabase
      .from('blog_posts')
      .insert({
        ...post,
        author_id: user?.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      .single());

    if (error) throw error;
    return data as unknown as BlogPost;
  }

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('blog_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as BlogPost;
  }

  async deleteBlogPost(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase
      .from('blog_posts') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==========================================================================
  // USER MANAGEMENT - Client side (wraps API calls)
  // ==========================================================================

  async getUserById(userId: string) {
    const supabase = createClient();

    const [profileResult, authResult] = await Promise.all([
      (supabase.from('users') as any).select('*').eq('id', userId).single(),
      supabase.auth.admin.getUserById(userId),
    ]);

    if (profileResult.error) throw profileResult.error;
    const profile = profileResult.data as Record<string, unknown>;

    const email = authResult.data?.user?.email || '';
    const isUserAdmin =
      authResult.data?.user?.user_metadata?.role === 'admin' ||
      email.endsWith('@axis3.com.tr');

    return {
      ...profile,
      email,
      last_sign_in_at: authResult.data?.user?.last_sign_in_at || null,
      is_admin: isUserAdmin,
    };
  }

  async getUserOrders(userId: string) {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('orders') as any)
      .select('id, order_number, status, payment_status, total_amount, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getUserFiles(userId: string) {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('files') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getUserActivityLogs(userId: string, limit = 5) {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('user_activity_logs') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'deleted') {
    const supabase = createClient();
    const { data, error } = await (supabase
      .from('users') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ==========================================================================
  // MACHINE AMORTIZATION
  // ==========================================================================

  async getMachineAmortization(): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('machine_amortization')
      .select('*')
      .order('machine_type', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async updateMachineAmortization(id: string, updates: Record<string, any>): Promise<any> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('machine_amortization')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ==========================================================================
  // RISK PREMIUM SETTINGS
  // ==========================================================================

  async getRiskPremiumSettings(): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('risk_premium_settings')
      .select('*')
      .order('technology', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async updateRiskPremiumSetting(id: string, updates: Record<string, any>): Promise<any> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('risk_premium_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ==========================================================================
  // LABOR TIME SETTINGS
  // ==========================================================================

  async getLaborTimeSettings(): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('labor_time_settings')
      .select('*')
      .order('task_type', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async updateLaborTimeSetting(id: string, updates: Record<string, any>): Promise<any> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('labor_time_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ==========================================================================
  // PRICING COEFFICIENTS (ECF)
  // ==========================================================================

  async getPricingCoefficients(): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('pricing_coefficients')
      .select('*')
      .eq('is_active', true)
      .order('key', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async updatePricingCoefficient(id: string, valueMinutes: number): Promise<any> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('pricing_coefficients')
      .update({ value_minutes: valueMinutes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ==========================================================================
  // ADMIN CHECK
  // ==========================================================================

  async isAdmin(): Promise<boolean> {
    try {
            const supabase = createClient();
      
      const { data, error } = await (supabase.rpc as any)('is_admin');
      
            if (error) {
        console.error('[AdminServiceClient] Error checking admin status:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('[AdminServiceClient] Exception checking admin status:', error);
      return false;
    }
  }
}

export const adminServiceClient = AdminServiceClient.getInstance();
