/**
 * Order Cancellation / Stock Release (server-only)
 *
 * Stock is reserved when the order is created. If the payment fails, the
 * payment is abandoned or the user cancels, the reservation must be returned
 * to inventory — otherwise stock leaks away on every failed checkout.
 *
 * Migration 093 adds a per-row stock ledger (`stock_movements`) plus
 * `order_items.stock_restored` / `store_order_items.stock_restored`. Restores
 * therefore go back to the exact inventory row that was deducted, and a retry
 * can never double-restore. Before 093 the code falls back to the legacy
 * order-level flag, which is safe but less precise.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { isMissingColumnError, isMissingFunctionError } from '@/lib/supabase/errors';
import { releaseCoupon } from '@/lib/services/coupon-service';
import { notifyOrderStatusChange } from '@/lib/services/order-notification-service';

export async function releaseOrderStock(orderId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: order } = await (supabase.from('orders') as any)
    .select('id, stock_restored')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return false;
  if (order.stock_restored) return true;

  // Per-item flags (migration 093) make partial failures retryable. Without
  // them, fall back to the legacy order-level behaviour.
  let flagsSupported = true;
  let itemsResult: any = await (supabase.from('order_items') as any)
    .select('id, material_id, material_name, color, quantity, nozzle_size_id, is_preorder, stock_restored')
    .eq('order_id', orderId);

  if (itemsResult.error && isMissingColumnError(itemsResult.error, 'stock_restored')) {
    flagsSupported = false;
    itemsResult = await (supabase.from('order_items') as any)
      .select('id, material_id, material_name, color, quantity, nozzle_size_id, is_preorder')
      .eq('order_id', orderId);
  }

  let storeResult: any = await (supabase.from('store_order_items') as any)
    .select('id, product_id, product_name, quantity, stock_restored')
    .eq('order_id', orderId);

  if (storeResult.error && isMissingColumnError(storeResult.error, 'stock_restored')) {
    flagsSupported = false;
    storeResult = await (supabase.from('store_order_items') as any)
      .select('id, product_id, product_name, quantity')
      .eq('order_id', orderId);
  }

  let hadFailure = false;

  for (const item of (itemsResult.data || []) as any[]) {
    if (item.is_preorder || !item.material_id) continue;
    if (flagsSupported && item.stock_restored) continue;

    const { data: material } = await (supabase.from('materials') as any)
      .select('technology')
      .eq('id', item.material_id)
      .maybeSingle();

    const technology = material?.technology === 'SLA' ? 'SLA' : 'FDM';
    const params = {
      p_material_id: item.material_id,
      p_color: item.color || 'Natural',
      p_quantity: item.quantity,
      p_nozzle_size_id: item.nozzle_size_id,
      p_technology: technology,
    };

    let restoreResult = await (supabase.rpc as any)('restore_inventory_stock', {
      ...params,
      p_order_id: orderId,
      p_order_item_id: item.id,
    });

    // Deployment may still be on migration 092.
    if (restoreResult.error && isMissingFunctionError(restoreResult.error)) {
      restoreResult = await (supabase.rpc as any)('restore_inventory_stock', params);
    }

    if (restoreResult.error) {
      hadFailure = true;
      console.error('[OrderCancellation] Inventory restore failed:', item.material_name, restoreResult.error);
      continue;
    }

    if (flagsSupported) {
      await (supabase.from('order_items') as any)
        .update({ stock_restored: true })
        .eq('id', item.id);
    }
  }

  for (const item of (storeResult.data || []) as any[]) {
    if (flagsSupported && item.stock_restored) continue;

    const { error } = await (supabase.rpc as any)('increment_store_product_stock', {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });

    if (error) {
      hadFailure = true;
      console.error('[OrderCancellation] Store stock restore failed:', item.product_name, error);
      continue;
    }

    if (flagsSupported) {
      await (supabase.from('store_order_items') as any)
        .update({ stock_restored: true })
        .eq('id', item.id);
    }
  }

  // With the item ledger/flags a retry is safe, so leave the order flag false
  // when something failed and let the next attempt finish the remaining rows.
  // Legacy (no flags) keeps the old behaviour: retrying would double-restore.
  if (hadFailure && flagsSupported) {
    return false;
  }

  const { error: flagError } = await (supabase.from('orders') as any)
    .update({ stock_restored: true, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (flagError) {
    console.error('[OrderCancellation] Could not mark stock_restored:', flagError);
    return false;
  }

  return !hadFailure;
}

export async function cancelOrder(
  orderId: string,
  reason: string,
  options: { paymentFailed?: boolean } = {}
): Promise<void> {
  const supabase = createServiceClient();

  await releaseOrderStock(orderId);

  // A cancelled/failed order must not burn its coupon: release the reservation
  // so the quota reopens for the next customer. Idempotent.
  await releaseCoupon(orderId);

  const patch: Record<string, unknown> = {
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  };

  if (options.paymentFailed) {
    patch.payment_status = 'failed';
    patch.payment_error = reason;
  }

  const { data: previous } = await (supabase.from('orders') as any)
    .select('status')
    .eq('id', orderId)
    .maybeSingle();

  const { error } = await (supabase.from('orders') as any)
    .update(patch)
    .eq('id', orderId);

  if (error) {
    console.error('[OrderCancellation] Order cancel failed:', error);
    throw new Error(`Sipariş iptal edilemedi: ${error.message}`);
  }

  // Tell the customer their order was cancelled. Best effort: a mail problem
  // must never undo or block the cancellation itself.
  if (previous?.status && previous.status !== 'cancelled') {
    try {
      await notifyOrderStatusChange(orderId, previous.status, 'cancelled');
    } catch (notifyError) {
      console.error('[OrderCancellation] Cancellation email failed:', notifyError);
    }
  }
}
