/**
 * Order Service
 * Axis3 - Order Management Service
 *
 * Client-side order *management* only. Order creation (pricing, stock
 * reservation, ownership checks) lives on the server in
 * `src/lib/services/order-creation-service.ts` and is reached through
 * `POST /api/v1/orders/create`.
 *
 * Features:
 * - Get user orders
 * - Update order status (admin)
 * - Cancel an unpaid order (delegates to the server so stock is released)
 */

import { createClient } from '@/lib/supabase/client';
import { notifyOrderStatusChange } from '@/lib/services/order-notification-service';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export type OrderStatus =
  | 'pending'
  | 'payment_received'
  | 'preparing'
  | 'printing'
  | 'quality_check'
  | 'packaging'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  file_id: string;
  filename: string;
  material_id: string;
  material_name: string;
  print_setting_id: string;
  print_setting_name: string;
  volume_cm3: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  color: string | null;
  nozzle_size_mm: number | null;
  layer_height: number | null;
  infill_percentage: number | null;
  estimated_time: number;
  is_preorder: boolean;
  preorder_discount_percent: number | null;
  estimated_restock_days: number;
  custom_layer_height: number | null;
  custom_infill_percentage: number | null;
  custom_time_multiplier: number | null;
  custom_layer_thickness: number | null;
  custom_exposure_time: number | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status?: string;
  payment_method?: string | null;
  payment_id?: string | null;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  shipping_address: {
    address: string;
    notes?: string;
  };
  billing_address: {
    address: string;
    notes?: string;
  };
  customer_notes: string | null;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

// =====================================================
// ORDER SERVICE CLASS
// =====================================================

export class OrderService {
  private supabase = createClient();

  /**
   * Generate unique order number
   * Format: AX3-YYYYMMDD-XXXX
   */
  generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `AX3-${year}${month}${day}-${random}`;
  }

  /**
   * Calculate estimated delivery date
   * @param days - Number of days to add
   */
  calculateEstimatedDelivery(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Get orders for a user
   */
  async getUserOrders(userId: string): Promise<{ success: boolean; orders?: Order[]; error?: string }> {
    try {
      const { data, error } = await (this.supabase
        .from('orders') as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch orders:', error);
        return { success: false, error: 'Siparişler yüklenemedi' };
      }

      return { success: true, orders: data as unknown as Order[] };
    } catch (error) {
      console.error('Get orders error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Get order by ID with items
   */
  async getOrderById(orderId: string, userId: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      // Get order
      const { data: order, error: orderError } = await (this.supabase
        .from('orders') as any)
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError || !order) {
        return { success: false, error: 'Sipariş bulunamadı' };
      }

      // Get order items
      const { data: items, error: itemsError } = await (this.supabase
        .from('order_items') as any)
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Failed to fetch order items:', itemsError);
        return { success: false, error: 'Sipariş kalemleri yüklenemedi' };
      }

      return {
        success: true,
        order: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(order as any),
          items: items as unknown as OrderItem[],
        } as Order,
      };
    } catch (error) {
      console.error('Get order error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Update order status
   * @param orderId - Order ID
   * @param status - New status
   * @param userId - User ID (for authorization)
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
                              // Get old status before update
      const { data: oldOrder } = await (this.supabase
        .from('orders') as any)
        .select('status')
        .eq('id', orderId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldStatus = oldOrder ? (oldOrder as any).status : 'unknown';
            const query = (this.supabase
        .from('orders') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      // If userId provided, ensure user owns the order
      if (userId) {
        query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        console.error('[OrderService.updateOrderStatus] ❌ Failed to update order status:', error);
        return { success: false, error: 'Sipariş durumu güncellenemedi' };
      }

      // Send the status e-mail through the shared notification service so the
      // message always includes the customer and the order items.
      if (oldStatus !== status) {
        notifyOrderStatusChange(orderId, oldStatus, status)
          .then((result) => {
            if (!result.success) {
              console.warn('[OrderService.updateOrderStatus] Status email not sent:', result.error);
            }
          })
          .catch((error) => {
            console.error('[OrderService.updateOrderStatus] ❌ Failed to send status update email:', error);
            // Don't fail the status update if email fails
          });
      }

      return { success: true };
    } catch (error) {
      console.error('[OrderService.updateOrderStatus] ❌ Exception:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Cancel an order.
   *
   * Cancellation must run on the server: it is the only place that can release
   * the stock reserved at checkout, and do it idempotently.
   */
  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order, error: fetchError } = await (this.supabase
        .from('orders') as any)
        .select('status')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !order) {
        return { success: false, error: 'Sipariş bulunamadı' };
      }

      const response = await fetch(`/api/v1/orders/${orderId}/cancel`, {
        method: 'POST',
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        return { success: false, error: result?.error || 'Sipariş iptal edilemedi' };
      }

      return { success: true };
    } catch (error) {
      console.error('Cancel order error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Get all orders (admin only) with items
   */
  async getAllOrders(): Promise<{ success: boolean; orders?: Order[]; error?: string }> {
    try {
      // Get all orders
      const { data: orders, error: ordersError } = await (this.supabase
        .from('orders') as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Failed to fetch all orders:', ordersError);
        return { success: false, error: 'Siparişler yüklenemedi' };
      }

      // Get all order items for these orders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderIds = (orders as any[])?.map((o: any) => o.id) || [];
      if (orderIds.length === 0) {
        return { success: true, orders: [] };
      }

      const { data: allItems, error: itemsError } = await this.supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Failed to fetch order items:', itemsError);
        // Return orders without items rather than failing completely
        return { success: true, orders: orders as unknown as Order[] };
      }

      // Get file IDs from items
      const fileIds = (allItems || []).map((item) => (item as { file_id?: string }).file_id).filter(Boolean);
      
      // Fetch file details if we have file IDs
      let fileDetailsMap: Record<string, object> = {};
      if (fileIds.length > 0) {
        const { data: files } = await (this.supabase
          .from('files') as any)
          .select('id, filename, original_filename, volume_cm3, surface_area_cm2, bounding_box_x, bounding_box_y, bounding_box_z, storage_path')
          .in('id', fileIds);
        
        if (files) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fileDetailsMap = files.reduce((acc: any, file: any) => {
            acc[file.id] = file;
            return acc;
          }, {});
        }
      }

      // Group items by order_id and attach file details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemsByOrderId = (allItems || []).reduce((acc: any, item: any) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push({
          ...item,
          file_details: fileDetailsMap[item.file_id] || null,
        });
        return acc;
      }, {});

      // Attach items to orders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ordersWithItems = (orders as any[])?.map((order: any) => ({
        ...order,
        items: itemsByOrderId[order.id] || [],
      })) as Order[];

      return { success: true, orders: ordersWithItems };
    } catch (error) {
      console.error('Get all orders error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }
}

// Singleton export
export const orderService = new OrderService();
