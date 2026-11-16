/**
 * Order notification service (server-only)
 *
 * Single place that turns an order status change into a customer e-mail.
 * Every status-changing entry point (admin API, order service, cancellation)
 * goes through here so the e-mail always sees the same complete order shape:
 * customer + items. Without the items join the status e-mail used to arrive
 * with an empty product list.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { mailService } from '@/lib/services/mail-service';
import type { EmailResult } from '@/lib/email/types';

export interface OrderNotificationOptions {
  /** Set to false to skip the e-mail for internal/technical transitions. */
  sendEmail?: boolean;
  /** Set to false to hide the carrier + tracking number in the e-mail. */
  includeTracking?: boolean;
}

/**
 * Send a status update e-mail for an order.
 *
 * `oldStatus` must be the status before the update; when it equals the current
 * status nothing is sent, because there is nothing to tell the customer.
 */
export async function notifyOrderStatusChange(
  orderId: string,
  oldStatus: string,
  newStatus?: string,
  options: OrderNotificationOptions = {}
): Promise<EmailResult> {
  if (options.sendEmail === false) {
    return { success: true };
  }

  try {
    const supabase = createServiceClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, user:users(email, full_name), items:order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('[notifyOrderStatusChange] Order fetch failed:', error);
      return { success: false, error: 'Sipariş bilgisi alınamadı' };
    }

    if (!order) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    const effectiveStatus = newStatus ?? order.status;

    if (oldStatus === effectiveStatus) {
      return { success: true };
    }

    return await mailService.sendOrderStatusUpdate(order, oldStatus, {
      includeTracking: options.includeTracking,
    });
  } catch (error) {
    console.error('[notifyOrderStatusChange] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bildirim gönderilemedi',
    };
  }
}
