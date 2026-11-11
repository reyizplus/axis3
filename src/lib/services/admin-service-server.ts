/**
 * Admin Service - Server Side
 * Server-only admin operations using server Supabase client
 * Used in Server Components only
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { mailService } from '@/lib/services/mail-service';
import { readActivityLogs } from '@/lib/logger';
import crypto from 'crypto';

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
  popularMaterials: Array<{ material: string; count: number }>;
  recentCalculations: Array<{
    id: string;
    material: string;
    quality: string;
    price: number;
    created_at: string;
  }>;
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
// SERVER ADMIN SERVICE
// ============================================================================

class AdminServiceServer {
  private static instance: AdminServiceServer;

  private constructor() {}

  static getInstance(): AdminServiceServer {
    if (!AdminServiceServer.instance) {
      AdminServiceServer.instance = new AdminServiceServer();
    }
    return AdminServiceServer.instance;
  }

  // ==========================================================================
  // GLOBAL SETTINGS
  // ==========================================================================

  async getGlobalSettings(): Promise<GlobalSetting[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('global_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) throw error;
    return (data as unknown as GlobalSetting[]) || [];
  }

  async getGlobalSetting(key: string): Promise<GlobalSetting | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('global_settings')
      .select('*')
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('global_settings')
      .update({
        value: value as any,
        description,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as GlobalSetting;
  }

  // ==========================================================================
  // MATERIALS
  // ==========================================================================

  async getMaterials(includeInactive = false): Promise<Material[]> {
    const supabase = await createClient();
    let query = supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as Material[]) || [];
  }

  async getMaterial(id: string): Promise<Material | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Material;
  }

  async createMaterial(material: Omit<Material, 'id' | 'created_at' | 'updated_at'>): Promise<Material> {
    const supabase = await createClient();
    const { data, error } = await (supabase.from('materials') as any)
      .insert(material)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Material;
  }

  async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const supabase = await createClient();
    const { data, error } = await (supabase.from('materials') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Material;
  }

  async deleteMaterial(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('materials')
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
    const supabase = await createClient();
    let query = supabase
      .from('print_settings')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as PrintSetting[]) || [];
  }

  async updatePrintSetting(id: string, updates: Partial<PrintSetting>): Promise<PrintSetting> {
    const supabase = await createClient();
    const { data, error } = await (supabase.from('print_settings') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as PrintSetting;
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async getPricingAnalytics(): Promise<PricingAnalytics> {
    const supabase = await createClient();

        // Get total calculations count
    const { count: totalCalculations, error: countError } = await supabase
      .from('pricing_history')
      .select('*', { count: 'exact', head: true });

        // Get average price
    const { data: avgData, error: avgError } = await supabase
      .from('pricing_history')
      .select('calculated_price');

        const averagePrice = avgData && avgData.length > 0
      ? (avgData as Array<{ calculated_price: number }>).reduce((sum, item) => sum + (item.calculated_price || 0), 0) / avgData.length
      : 0;

    // Get popular materials from pricing history
    const { data: materialData, error: materialError } = await supabase
      .from('pricing_history')
      .select('material_id, materials(name)')
      .order('created_at', { ascending: false });

        // Count material usage
    const materialCounts = new Map<string, { name: string; count: number }>();
    (materialData as unknown as Array<{ materials: { name: string } | null }>)?.forEach((item) => {
      const materialName = item.materials?.name || 'Unknown';
      const current = materialCounts.get(materialName) || { name: materialName, count: 0 };
      materialCounts.set(materialName, { name: materialName, count: current.count + 1 });
    });

    // Sort by count and get top 3
    const popularMaterials = Array.from(materialCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(m => ({ material: m.name, count: m.count }));

        // Get recent calculations with material and quality names
    const { data: recentData, error: recentError } = await supabase
      .from('pricing_history')
      .select(`
        id,
        material_id,
        print_setting_id,
        calculated_price,
        created_at,
        materials(name),
        print_settings(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

            const recentCalculations = (recentData as unknown as Array<{
      id: string;
      materials: { name: string } | null;
      print_settings: { name: string } | null;
      calculated_price: number;
      created_at: string;
    }>)?.map((item) => ({
      id: item.id,
      material: item.materials?.name || 'Unknown',
      quality: item.print_settings?.name || 'Standard',
      price: item.calculated_price || 0,
      created_at: item.created_at,
    })) || [];

        const result = {
      totalCalculations: totalCalculations || 0,
      averagePrice,
      popularMaterials,
      recentCalculations,
    };

        return result;
  }

  // ==========================================================================
  // BLOG CATEGORIES
  // ==========================================================================

  async getBlogCategories(includeInactive = false): Promise<BlogCategory[]> {
    const supabase = await createClient();
    let query = supabase
      .from('blog_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getBlogCategory(id: string): Promise<BlogCategory | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createBlogCategory(category: Omit<BlogCategory, 'id' | 'created_at' | 'updated_at'>): Promise<BlogCategory> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('blog_categories')
      .insert(category as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBlogCategory(id: string, updates: Partial<BlogCategory>): Promise<BlogCategory> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('blog_categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBlogCategory(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('blog_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==========================================================================
  // BLOG POSTS
  // ==========================================================================

  async getBlogPosts(filters?: { status?: string; category_id?: string }): Promise<BlogPost[]> {
    const supabase = await createClient();
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status as any);
    }

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getBlogPost(id: string): Promise<BlogPost | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createBlogPost(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'view_count'>): Promise<BlogPost> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        ...post,
        author_id: user?.id,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBlogPost(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

  async getUserById(userId: string) {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Get auth user
    const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(userId);
    if (authError) throw authError;

    // Get public profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (profileError) throw profileError;

    const isUserAdmin =
      authUser.user?.user_metadata?.role === 'admin' ||
      authUser.user?.email?.endsWith('@axis3.com.tr') ||
      false;

    return {
      ...profile,
      email: authUser.user?.email || '',
      last_sign_in_at: authUser.user?.last_sign_in_at || null,
      is_admin: isUserAdmin,
      auth_created_at: authUser.user?.created_at,
    };
  }

  async getUserOrders(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, payment_status, total_amount, created_at,
        order_items(id, file_id, filename, material_name, print_setting_name, quantity, unit_price, subtotal)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getUserFiles(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getUserActivityLogs(userId: string, limit = 50) {
    const result: Array<{
      id: string; page_url: string; device_type: string; ip_address: string;
      user_agent: string | null; user_email: string; user_name: string; created_at: string;
    }> = [];

    try {
      const supabase = await createClient();

      const { data: authData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (authData) {
        for (const e of authData) {
          const action = (e.action || '').replace('auth:', '');
          result.push({
            id: e.id,
            page_url: `/auth/${action.toLowerCase()}`,
            device_type: 'unknown',
            ip_address: e.ip_address || 'unknown',
            user_agent: e.user_agent || null,
            user_email: '',
            user_name: '',
            created_at: e.created_at || new Date().toISOString(),
          });
        }
      }

      const { data: uaData } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (uaData) {
        for (const e of uaData) {
          result.push({
            id: e.id,
            page_url: e.page_url || '',
            device_type: e.device_type || 'unknown',
            ip_address: e.ip_address || 'unknown',
            user_agent: e.user_agent || null,
            user_email: '',
            user_name: '',
            created_at: e.created_at || new Date().toISOString(),
          });
        }
      }
    } catch {
      // DB failed, fall through to file
    }

    if (result.length === 0) {
      const fileEntries = readActivityLogs(userId, limit);
      for (let i = 0; i < fileEntries.length; i++) {
        const e = fileEntries[i];
        result.push({
          id: e.timestamp ? `${userId}-${(e.timestamp as string).replace(/[:.]/g, '-')}-${i}` : `log-${i}`,
          page_url: (e.page_url as string) || '',
          device_type: (e.device_type as string) || 'unknown',
          ip_address: (e.ip_address as string) || 'unknown',
          user_agent: (e.user_agent as string | null) || null,
          user_email: (e.user_email as string) || '',
          user_name: (e.user_name as string) || '',
          created_at: (e.timestamp as string) || new Date().toISOString(),
        });
      }
    }

    result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return result.slice(0, limit);
  }

  async getUserCart(userId: string) {
    try {
      const supabase = await createClient();
      const { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let allItems: unknown[] = [];
      let totalPrice = 0;
      let totalItems = 0;

      if (cart && !cartError) {
        const { data: items, error: itemsError } = await supabase
          .from('cart_items')
          .select('*')
          .eq('cart_id', cart.id)
          .order('created_at', { ascending: true });
        if (!itemsError && items) {
          // Filter out items referencing soft-deleted files
          const fileIds = items
            .map(i => i.file_id)
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
          const validItems = items.filter(
            (i: any) => !i.file_id || activeFileIds.has(i.file_id)
          );
          allItems = validItems.map(i => ({ ...i, _item_type: '3d_print' }));
          totalPrice = validItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
          totalItems = validItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
        }
      }

      const { data: storeItems, error: storeError } = await supabase
        .from('store_cart_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!storeError && storeItems && storeItems.length > 0) {
        // Filter out items referencing inactive/deleted products
        const productIds = storeItems.map(i => i.product_id);
        let activeProductIds = new Set<string>();
        if (productIds.length > 0) {
          const { data: activeProducts } = await supabase
            .from('store_products')
            .select('id')
            .eq('is_active', true)
            .in('id', productIds);
          activeProductIds = new Set((activeProducts || []).map((p: any) => p.id));
        }
        const validStoreItems = storeItems.filter(i => activeProductIds.has(i.product_id));

        const mapped = validStoreItems.map((i) => ({
          id: i.id,
          cart_id: '',
          file_id: i.product_id,
          filename: i.product_name,
          volume_cm3: null,
          material_id: '',
          material_name: 'Mağaza Ürünü',
          print_setting_id: '',
          print_setting_name: 'Mağaza',
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
          estimated_time: null,
          technology: null as string | null,
          color: null as string | null,
          nozzle_size_id: null as string | null,
          nozzle_size_mm: null as number | null,
          is_preorder: false,
          preorder_discount_percent: null as number | null,
          estimated_restock_days: null as number | null,
          custom_layer_height: null as number | null,
          custom_infill_percentage: null as number | null,
          custom_time_multiplier: null as number | null,
          custom_layer_thickness: null as number | null,
          custom_exposure_time: null as number | null,
          delivery_days: null as number | null,
          created_at: i.created_at,
          _item_type: 'store',
          _store_product_slug: i.product_slug,
          _store_image_url: i.image_url,
        }));
        allItems = [...allItems, ...mapped];
        totalPrice += validStoreItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
        totalItems += validStoreItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
      }

      if (allItems.length === 0 && !cart) return null;

      return {
        id: cart?.id || 'store-only',
        user_id: userId,
        created_at: cart?.created_at || new Date().toISOString(),
        updated_at: cart?.updated_at || new Date().toISOString(),
        items: allItems,
        totalPrice,
        totalItems,
      };
    } catch {
      return null;
    }
  }

  async getUserAuthEvents(userId: string, limit = 20) {
    try {
      const supabase = await createClient();
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      let query = supabase
        .from('audit_logs')
        .select('*');

      if (userProfile?.email) {
        query = query.or(`user_id.eq.${userId},entity_id.eq.${userProfile.email}`);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query
        .not('action', 'eq', 'page_view')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  async getUserPayments(userId: string) {
    try {
      const supabase = await createClient();
      const { data: orderIds } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId);
      if (!orderIds || orderIds.length === 0) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('order_id', orderIds.map(o => o.id))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  async getUserPricingRules(userId: string) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('corporate_pricing_rules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  async getUserAddresses(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getUserFeedback(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feedback')
      .select('id, category, title, description, status, priority, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getUserStorageUsage(userId: string) {
    const supabase = await createClient();
    const { data: files, error } = await supabase
      .from('files')
      .select('file_size')
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (error) throw error;
    const totalBytes = (files || []).reduce((sum, f) => sum + (f.file_size || 0), 0);
    return { totalBytes, fileCount: files?.length || 0 };
  }

  async getUserGuestSession(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('guest_sessions')
      .select('*')
      .eq('converted_to_user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getOrderStatusCounts() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('status');
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data || []).forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }

  async getRecentSignups(days = 7) {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { count: data?.length || 0, users: data || [] };
  }

  async sendPasswordResetEmail(userId: string) {
    const serviceClient = createServiceClient();

    const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(userId);
    if (authError) throw authError;
    if (!authUser.user?.email) throw new Error('User has no email');

    const token = crypto.randomBytes(32).toString('hex');
    const urlToken = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await serviceClient
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId)
      .is('used_at', null);

    const { error: insertError } = await serviceClient
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        token,
        url_token: urlToken,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) throw new Error('Failed to create reset token');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?ref=${urlToken}`;

    const result = await mailService.sendPasswordResetEmail(authUser.user.email, resetUrl);
    if (!result.success) throw new Error(result.error || 'Failed to send password reset email');

    return { success: true, email: authUser.user.email, messageId: result.messageId };
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'deleted') {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async grantAdminRole(userId: string, currentUser: any, sections?: string[]) {
    const svc = createServiceClient();

    // Only axis3.com.tr users can grant admin role
    if (!currentUser.email?.endsWith('@axis3.com.tr')) {
      throw new Error('Sadece @axis3.com.tr uzantılı yöneticiler admin atayabilir');
    }

    const { data: targetUser, error: targetError } = await svc.auth.admin.getUserById(userId);
    if (targetError) throw targetError;

    if (targetUser.user?.user_metadata?.role === 'admin') {
      throw new Error('Bu kullanıcı zaten admin');
    }

    // Grant only specified sections (or none if not provided)
    const sectionsToGrant = sections || [];
    for (const section of sectionsToGrant) {
      try {
        await svc.from('admin_permissions').upsert({
          user_id: userId,
          section_key: section,
          granted_by: currentUser.id,
        });
      } catch { /* ignore duplicates */ }
    }

    const { data, error } = await svc.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...targetUser.user?.user_metadata,
        role: 'admin',
      },
    });
    if (error) throw error;

    return {
      success: true,
      is_admin: true,
      email: targetUser.user?.email,
      sections_granted: sectionsToGrant,
    };
  }

  async revokeAdminRole(userId: string, currentUser: any) {
    const svc = createServiceClient();

    // Only axis3.com.tr users can revoke admin role
    if (!currentUser.email?.endsWith('@axis3.com.tr')) {
      throw new Error('Sadece @axis3.com.tr uzantılı yöneticiler admin yetkisini kaldırabilir');
    }

    const { data: targetUser, error: targetError } = await svc.auth.admin.getUserById(userId);
    if (targetError) throw targetError;

    // Can't revoke axis3.com.tr admins
    if (targetUser.user?.email?.endsWith('@axis3.com.tr')) {
      throw new Error('@axis3.com.tr yöneticisinin yetkisi kaldırılamaz');
    }

    // Remove admin role and permissions at DB level (bypasses GoTrue merge-only user_metadata)
    const { error: rpcError } = await svc.rpc('admin_revoke_admin_role', { user_uuid: userId });
    if (rpcError) throw rpcError;

    return {
      success: true,
      is_admin: false,
      email: targetUser.user?.email,
    };
  }

  // ==========================================================================
  // PRICE CALCULATION DETAIL
  // ==========================================================================

  async getPriceCalculationDetail(calculationId: string) {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Try pricing_history first (with file relation for model + user info)
    const { data: historyData } = await supabase
      .from('pricing_history')
      .select(`
        *,
        materials(name, code, technology),
        print_settings(name, code, layer_height, infill_percentage, time_multiplier, price_multiplier),
        files(id, filename, original_filename, storage_path, volume_cm3, surface_area_cm2, preview_data, thumbnail_path, user_id)
      `)
      .eq('id', calculationId)
      .maybeSingle();

    if (historyData) {
      const uid = (historyData as Record<string, unknown>).files
        ? ((historyData as Record<string, unknown>).files as Record<string, unknown>).user_id as string | undefined
        : undefined;
      if (uid) {
        const { data: authUser } = await serviceClient.auth.admin.getUserById(uid);
        return { ...historyData, user: authUser?.user ? { id: authUser.user.id, email: authUser.user.email } : null };
      }
      return { ...historyData, user: null };
    }

    // Fallback to price_calculations
    const { data: calcData } = await supabase
      .from('price_calculations')
      .select(`
        *,
        materials(name, code, technology),
        print_settings(name, code, layer_height, infill_percentage, time_multiplier, price_multiplier),
        files(id, filename, original_filename, storage_path, volume_cm3, surface_area_cm2, preview_data, thumbnail_path, user_id)
      `)
      .eq('id', calculationId)
      .maybeSingle();

    if (calcData) {
      // Look up user info from files.user_id
      const userId = (calcData as Record<string, unknown>).files
        ? ((calcData as Record<string, unknown>).files as Record<string, unknown>).user_id as string | undefined
        : undefined;
      if (userId) {
        const { data: authUser } = await serviceClient.auth.admin.getUserById(userId);
        return { ...calcData, user: authUser?.user ? { id: authUser.user.id, email: authUser.user.email } : null };
      }
      return { ...calcData, user: null };
    }

    return null;
  }

  // ==========================================================================
  // SYSTEM HEALTH
  // ==========================================================================

  async getSystemHealth() {
    const supabase = await createClient();

    // Total STL storage usage (bytes)
    const { data: storageData } = await supabase
      .from('files')
      .select('file_size')
      .is('deleted_at', null);

    const totalFileCount = storageData?.length || 0;
    const totalStorageBytes = (storageData as Array<{ file_size: number }> | null)
      ?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;

    // Database ping
    let dbOnline = false;
    try {
      const { error: pingErr } = await supabase
        .from('files')
        .select('id', { count: 'exact', head: true });
      dbOnline = !pingErr;
    } catch {
      dbOnline = false;
    }

    // Last activity (newest pricing_history entry)
    const { data: lastCalc } = await supabase
      .from('pricing_history')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Total calculations count
    const { count: totalCalcs } = await supabase
      .from('pricing_history')
      .select('*', { count: 'exact', head: true });

    // Last user activity log
    const { data: lastActivity } = await supabase
      .from('user_activity_logs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      dbOnline,
      totalStorageBytes,
      totalFileCount,
      totalCalculations: totalCalcs || 0,
      lastCalculationDate: lastCalc?.created_at || null,
      lastActivityDate: lastActivity?.created_at || null,
    };
  }

  // ==========================================================================
  // ADMIN CHECK
  // ==========================================================================

  async isAdmin(): Promise<boolean> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('is_admin');
      
      if (error) {
        return false;
      }
      
      return data === true;
    } catch {
      return false;
    }
  }

  async isSuperAdmin(): Promise<boolean> {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return false;
      return user.email.endsWith('@axis3.com.tr');
    } catch {
      return false;
    }
  }

  async getAdminPermissions(userId: string): Promise<string[]> {
    try {
      const svc = createServiceClient();
      const { data } = await svc
        .from('admin_permissions')
        .select('section_key')
        .eq('user_id', userId);
      return (data || []).map((r) => r.section_key);
    } catch {
      return [];
    }
  }

  async setAdminPermissions(userId: string, sections: string[]): Promise<void> {
    const supabase = await createClient();
    const svc = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // Delete all existing permissions for user
    await svc.from('admin_permissions').delete().eq('user_id', userId);

    // Insert new permissions
    if (sections.length > 0) {
      const records = sections.map(section => ({
        user_id: userId,
        section_key: section,
        granted_by: user.id,
      }));
      const { error } = await svc.from('admin_permissions').insert(records);
      if (error) throw error;
    }
  }

  async hasPermission(userId: string, sectionKey: string): Promise<boolean> {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email?.endsWith('@axis3.com.tr')) return true;

      const { data } = await supabase.rpc('has_admin_permission', { section_key: sectionKey });
      return data === true;
    } catch {
      return false;
    }
  }

  // All available admin section keys
  static readonly ADMIN_SECTIONS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'orders', label: 'Siparişler' },
    { key: 'materials', label: 'Malzemeler' },
    { key: 'inventory', label: 'Envanter' },
    { key: 'users', label: 'Kullanıcılar' },
    { key: 'cargo', label: 'Kargo' },
    { key: 'storage', label: 'Depo' },
    { key: 'blog', label: 'Blog' },
    { key: 'feedback', label: 'Geri Bildirim' },
    { key: 'store-products', label: 'Mağaza Ürünler' },
    { key: 'store-categories', label: 'Mağaza Kategoriler' },
    { key: 'security', label: 'Sunucu Logları' },
    { key: 'settings', label: 'Ayarlar' },
  ] as const;

  // ==========================================================================
  // USER DELETION
  // ==========================================================================

  async deleteUser(userId: string) {
    const serviceClient = createServiceClient();

    const { data: userFiles } = await serviceClient
      .from('files')
      .select('id, storage_path')
      .eq('user_id', userId)
      .is('deleted_at', null);

    const storagePathsToDelete: string[] = [];

    if (userFiles && userFiles.length > 0) {
      for (const file of userFiles) {
        const { data: inOrder } = await serviceClient
          .rpc('check_file_in_orders', { file_uuid: file.id });

        if (!inOrder) {
          storagePathsToDelete.push(file.storage_path);
        }
      }
    }

    if (storagePathsToDelete.length > 0) {
      for (let i = 0; i < storagePathsToDelete.length; i += 100) {
        const chunk = storagePathsToDelete.slice(i, i + 100);
        await serviceClient.storage.from('stl-files').remove(chunk);
      }
    }
    try {
      await serviceClient.storage.from('images').remove(storagePathsToDelete);
    } catch {
      // images bucket may not exist or paths may not be in it
    }

    const { data: result, error } = await serviceClient
      .rpc('admin_delete_user_complete', { user_uuid: userId });

    if (error) throw error;

    try {
      await serviceClient.auth.admin.deleteUser(userId);
    } catch {
      // Auth user might already be deleted
    }

    return result;
  }

  // ==========================================================================
  // STORAGE / FILE MANAGEMENT
  // ==========================================================================

  async getAllFiles() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('files')
      .select(`
        *,
        users:user_id (id, full_name, email)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const dbFiles = data || [];

    const dbStoragePaths = new Set(dbFiles.map(f => f.storage_path));

    const svc = createServiceClient();
    const bucketFiles: any[] = [];
    try {
      const { data: bucketData, error: bucketError } = await (svc as any).storage
        .from('images')
        .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
      if (!bucketError && bucketData) {
        for (const item of bucketData) {
          if (!dbStoragePaths.has(item.name) && item.id) {
            bucketFiles.push({
              id: item.id || `bucket-${item.name}`,
              user_id: null,
              filename: item.name,
              original_filename: item.name.split('/').pop() || item.name,
              file_size: item.metadata?.size || 0,
              mime_type: item.metadata?.mimetype || 'image/png',
              storage_path: item.name,
              bucket_name: 'images',
              analysis_status: 'completed',
              has_errors: false,
              volume_cm3: null,
              surface_area_cm2: null,
              bounding_box_x: null,
              bounding_box_y: null,
              bounding_box_z: null,
              triangle_count: null,
              is_manifold: null,
              thumbnail_path: null,
              color: null,
              metadata: {},
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || new Date().toISOString(),
              deleted_at: null,
              users: null,
            });
          }
        }
      }
    } catch {
      // bucket listing non-critical
    }

    return [...dbFiles, ...bucketFiles];
  }

  async getFileById(fileId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('files')
      .select(`
        *,
        users:user_id (id, full_name, email)
      `)
      .eq('id', fileId)
      .single();

    if (error) throw error;
    return data;
  }

  async getStorageStats() {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_storage_stats');

    if (error) throw error;
    return data;
  }

  async adminDeleteFile(fileId: string) {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) throw new Error('File not found');

    const { data: inOrder } = await serviceClient
      .rpc('check_file_in_orders', { file_uuid: fileId });

    if (inOrder) {
      throw new Error('Bu dosya bir siparişte kullanıldığı için silinemez');
    }

    const bucketName = file.mime_type?.startsWith('image/') ? 'images' : 'stl-files';

    const { error: storageError } = await serviceClient.storage
      .from(bucketName)
      .remove([file.storage_path]);

    if (storageError) throw new Error(`Storage silme hatası: ${storageError.message}`);

    const { error: dbError } = await serviceClient
      .from('files')
      .delete()
      .eq('id', fileId);

    if (dbError) throw new Error(`Veritabanı silme hatası: ${dbError.message}`);

    return { success: true };
  }

  async getFileSignedUrl(storagePath: string, expiresIn = 3600, bucketName = 'stl-files') {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  async updateFile(fileId: string, updates: Record<string, unknown>) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('files')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const adminServiceServer = AdminServiceServer.getInstance();
