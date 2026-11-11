import { createClient } from '@/lib/supabase/server';

export type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'name_asc' | 'name_desc';

export interface ProductFilter {
  category_slug?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  sort?: SortOption;
  page?: number;
  per_page?: number;
  featured?: boolean;
}

export interface StoreCategory {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
  children?: StoreCategory[];
}

export interface StoreProduct {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  track_stock: boolean;
  allow_backorder: boolean;
  sku: string | null;
  weight_grams: number | null;
  unit: string;
  main_image_url: string | null;
  barcode: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  category?: StoreCategory | null;
  images?: StoreProductImage[];
  created_at: string;
  updated_at: string;
}

export interface StoreProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_main: boolean;
}

export interface StoreOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function handleError(error: unknown, context: string): ServiceResult<never> {
  console.error(`[StoreService] ${context}:`, error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  return { success: false, error: message };
}

async function db() {
  return (await createClient()) as any;
}

export const storeService = {
  async getCategories(includeInactive = false): Promise<ServiceResult<StoreCategory[]>> {
    try {
      const supabase = await db();
      let query = supabase.from('store_categories').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true });
      if (!includeInactive) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data as StoreCategory[] };
    } catch (error) {
      return handleError(error, 'getCategories');
    }
  },

  async getCategoriesTree(includeInactive = false): Promise<ServiceResult<StoreCategory[]>> {
    const result = await this.getCategories(includeInactive);
    if (!result.success || !result.data) return result;
    const map = new Map<string, StoreCategory & { children: StoreCategory[] }>();
    const roots: (StoreCategory & { children: StoreCategory[] })[] = [];
    result.data.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
    result.data.forEach(cat => {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) map.get(cat.parent_id)!.children.push(node);
      else roots.push(node);
    });
    return { success: true, data: roots };
  },

  async getCategoryBySlug(slug: string): Promise<ServiceResult<StoreCategory>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_categories').select('*').eq('slug', slug).single();
      if (error) throw error;
      return { success: true, data: data as StoreCategory };
    } catch (error) {
      return handleError(error, 'getCategoryBySlug');
    }
  },

  async createCategory(input: Partial<StoreCategory>): Promise<ServiceResult<StoreCategory>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_categories').insert(input).select().single();
      if (error) throw error;
      return { success: true, data: data as StoreCategory };
    } catch (error) {
      return handleError(error, 'createCategory');
    }
  },

  async updateCategory(id: string, input: Partial<StoreCategory>): Promise<ServiceResult<StoreCategory>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_categories').update(input).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data: data as StoreCategory };
    } catch (error) {
      return handleError(error, 'updateCategory');
    }
  },

  async deleteCategory(id: string): Promise<ServiceResult<void>> {
    try {
      const supabase = await db();
      const { error } = await supabase.from('store_categories').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return handleError(error, 'deleteCategory');
    }
  },

  async getProducts(filter: ProductFilter = {}): Promise<ServiceResult<PaginatedResult<StoreProduct>>> {
    try {
      const supabase = await db();
      const page = filter.page || 1;
      const per_page = filter.per_page || 12;
      const from = (page - 1) * per_page;
      const to = from + per_page - 1;

      let query = supabase.from('store_products').select('*, category:store_categories(*)', { count: 'exact' }).is('deleted_at', null);

      query = query.eq('is_active', true);
      if (filter.category_slug) {
        const { data: cat } = await supabase.from('store_categories').select('id').eq('slug', filter.category_slug).single();
        if (cat) query = query.eq('category_id', cat.id);
        else return { success: true, data: { data: [], total: 0, page, per_page, total_pages: 0 } };
      }
      if (filter.featured) query = query.eq('is_featured', true);
      if (filter.search) query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%,sku.ilike.%${filter.search}%`);
      if (filter.min_price !== undefined) query = query.gte('price', filter.min_price);
      if (filter.max_price !== undefined) query = query.lte('price', filter.max_price);

      query = query.order('is_featured', { ascending: false });

      switch (filter.sort) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'newest': query = query.order('created_at', { ascending: false }); break;
        case 'oldest': query = query.order('created_at', { ascending: true }); break;
        case 'name_asc': query = query.order('name', { ascending: true }); break;
        case 'name_desc': query = query.order('name', { ascending: false }); break;
        default: query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false });
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      return {
        success: true,
        data: { data: data as StoreProduct[], total: count || 0, page, per_page, total_pages: Math.ceil((count || 0) / per_page) },
      };
    } catch (error) {
      return handleError(error, 'getProducts');
    }
  },

  async getProductBySlug(slug: string): Promise<ServiceResult<StoreProduct>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_products').select('*, category:store_categories(*), images:store_product_images(*)').eq('slug', slug).eq('is_active', true).is('deleted_at', null).single();
      if (error) throw error;
      return { success: true, data: data as StoreProduct };
    } catch (error) {
      return handleError(error, 'getProductBySlug');
    }
  },

  async getProductById(id: string): Promise<ServiceResult<StoreProduct>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_products').select('*, category:store_categories(*), images:store_product_images(*)').eq('id', id).eq('is_active', true).is('deleted_at', null).single();
      if (error) throw error;
      return { success: true, data: data as StoreProduct };
    } catch (error) {
      return handleError(error, 'getProductById');
    }
  },

  async updateProductWithImages(id: string, input: { main_image_url?: string | null; name?: string; gallery_images?: string[] } & Partial<StoreProduct>): Promise<ServiceResult<StoreProduct>> {
    try {
      const supabase = await db();
      const { gallery_images, ...productData } = input;

      if (productData.main_image_url) {
        const { data: oldProduct } = await supabase.from('store_products').select('main_image_url').eq('id', id).single();
        if (oldProduct && oldProduct.main_image_url && oldProduct.main_image_url !== productData.main_image_url) {
          const oldPath = oldProduct.main_image_url.split('/').pop();
          if (oldPath) await supabase.storage.from('product-images').remove([oldPath]).catch(() => {});
        }
      }

      const { data, error } = await supabase.from('store_products').update(productData).eq('id', id).select().single();
      if (error) throw error;

      if (gallery_images !== undefined) {
        const { data: oldImages } = await supabase
          .from('store_product_images')
          .select('image_url')
          .eq('product_id', id)
          .eq('is_main', false);

        const oldUrls: string[] = (oldImages || []).map((i: any) => i.image_url);
        const newUrls: string[] = gallery_images || [];

        await supabase.from('store_product_images').delete().eq('product_id', id).eq('is_main', false);

        if (Array.isArray(gallery_images) && gallery_images.length > 0) {
          const galleryPayload = gallery_images.map((url: string, i: number) => ({
            product_id: id,
            image_url: url,
            alt_text: (productData as any).name || '',
            sort_order: i,
            is_main: false,
          }));
          await supabase.from('store_product_images').insert(galleryPayload);
        }

        const orphaned = oldUrls.filter(url => !newUrls.includes(url));
        for (const url of orphaned) {
          const path = url.split('/').pop();
          if (path) {
            await supabase.storage.from('product-images').remove([path]).catch(() => {});
          }
        }
      }

      return { success: true, data: data as StoreProduct };
    } catch (error) {
      return handleError(error, 'updateProductWithImages');
    }
  },

  async createProduct(input: Partial<StoreProduct>): Promise<ServiceResult<StoreProduct>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_products').insert(input).select().single();
      if (error) throw error;
      return { success: true, data: data as StoreProduct };
    } catch (error) {
      return handleError(error, 'createProduct');
    }
  },

  async updateProduct(id: string, input: Partial<StoreProduct>): Promise<ServiceResult<StoreProduct>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_products').update(input).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data: data as StoreProduct };
    } catch (error) {
      return handleError(error, 'updateProduct');
    }
  },

  async deleteProduct(id: string, hardDelete = false): Promise<ServiceResult<void>> {
    try {
      const supabase = await db();

      // Clean up images from storage before deleting
      const { data: product } = await supabase.from('store_products').select('main_image_url').eq('id', id).single();
      const { data: images } = await supabase.from('store_product_images').select('image_url').eq('product_id', id);
      const storageUrls = [product?.main_image_url, ...(images?.map((i: any) => i.image_url) || [])].filter(Boolean);
      for (const url of storageUrls) {
        const path = (url as string).split('/').pop();
        if (path) await supabase.storage.from('product-images').remove([path]).catch(() => {});
      }

      if (hardDelete) {
        const { error } = await supabase.from('store_products').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('store_products').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
        if (error) throw error;
      }
      return { success: true };
    } catch (error) {
      return handleError(error, 'deleteProduct');
    }
  },

  async checkStock(productId: string, quantity: number): Promise<ServiceResult<{ available: boolean; stock: number }>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_products').select('stock_quantity, track_stock').eq('id', productId).single();
      if (error) throw error;
      const available = !data.track_stock || data.stock_quantity >= quantity;
      return { success: true, data: { available, stock: data.stock_quantity } };
    } catch (error) {
      return handleError(error, 'checkStock');
    }
  },

  async decrementStock(productId: string, quantity: number): Promise<ServiceResult<void>> {
    try {
      const supabase = await db();
      const { error } = await supabase.rpc('decrement_store_product_stock', { p_product_id: productId, p_quantity: quantity });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return handleError(error, 'decrementStock');
    }
  },

  async getStoreOrderItems(orderId: string): Promise<ServiceResult<StoreOrderItem[]>> {
    try {
      const supabase = await db();
      const { data, error } = await supabase.from('store_order_items').select('*').eq('order_id', orderId);
      if (error) throw error;
      return { success: true, data: data as StoreOrderItem[] };
    } catch (error) {
      return handleError(error, 'getStoreOrderItems');
    }
  },
};
