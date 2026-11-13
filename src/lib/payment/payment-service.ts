/**
 * Payment Service
 * Axis3 - iyzico Payment Integration
 * 
 * This service handles all payment-related operations including:
 * - Payment initialization
 * - Payment callback handling
 * - Payment status retrieval
 */

import { getIyzipayClient, BASKET_ITEM_TYPE, PAYMENT_CONFIG } from './iyzico-client';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isMissingColumnError } from '@/lib/supabase/errors';
import { mailService } from '@/lib/services/mail-service';
import { cancelOrder } from '@/lib/services/order-cancellation-service';

export interface PaymentInitRequest {
  orderId: string;
}

export interface PaymentInitResponse {
  success: boolean;
  paymentPageUrl?: string;
  token?: string;
  error?: string;
}

export interface PaymentCallbackResponse {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Initialize payment with iyzico
   */
  async initializePayment(orderId: string): Promise<PaymentInitResponse> {
    try {
            // Get order details
      const order = await this.getOrderDetails(orderId);
      
            if (!order) {
                return {
          success: false,
          error: 'Order not found'
        };
      }

            // Prepare iyzico request
      const request = {
        locale: PAYMENT_CONFIG.locale,
        conversationId: orderId,
        price: order.total_amount.toFixed(2),
        paidPrice: order.total_amount.toFixed(2),
        currency: PAYMENT_CONFIG.currency,
        basketId: orderId,
        paymentGroup: PAYMENT_CONFIG.paymentGroup,
        callbackUrl: PAYMENT_CONFIG.callbackUrl,
        enabledInstallments: PAYMENT_CONFIG.enabledInstallments,
        buyer: this.mapBuyer(order),
        shippingAddress: this.mapAddress(order.shipping_address),
        billingAddress: this.mapAddress(order.shipping_address),
        basketItems: this.mapBasketItems(order.items, order)
      };

            // Initialize checkout form
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: any = await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getIyzipayClient().checkoutFormInitialize.create(request as any, (err: any, result: any) => {
          if (err) {
                        reject(err);
          } else {
                        resolve(result);
          }
        });
      });

      if (result.status === 'success') {
                // Save payment token to order
        await this.updateOrderPaymentToken(orderId, result.token);

        return {
          success: true,
          paymentPageUrl: result.paymentPageUrl,
          token: result.token
        };
      } else {
                return {
          success: false,
          error: result.errorMessage || 'Payment initialization failed'
        };
      }
    } catch (error) {
      console.error('[PaymentService] Exception during payment initialization:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initialization failed'
      };
    }
  }

  /**
   * Handle payment callback from iyzico
   */
  async handleCallback(token: string): Promise<PaymentCallbackResponse> {
    try {
            // Retrieve payment result
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getIyzipayClient().checkoutForm.retrieve({ token }, (err: any, result: any) => {
          if (err) {
            console.error('[PaymentService.handleCallback] iyzico API error:', err);
            reject(err);
          } else {
                        resolve(result);
          }
        });
      });

      // We send the order id as conversationId at initialization. Prefer it
      // over basketId, which may point at a basket item instead of the order.
      const orderId = result.conversationId || result.basketId;

      if (!orderId) {
        console.error('[PaymentService.handleCallback] Missing order reference in iyzico response');
        return { success: false, error: 'Sipariş referansı bulunamadı' };
      }

      const matchedOrder = await this.findOrderForToken(orderId, token);
      if (!matchedOrder) {
        console.error('[PaymentService.handleCallback] Order/token mismatch for order:', orderId);
        return { success: false, error: 'Sipariş doğrulanamadı' };
      }

      if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
                // Update order with payment success
                await this.updateOrderPaymentSuccess(orderId, {
          paymentId: result.paymentId,
          paymentMethod: result.cardType || 'credit_card',
          paymentDate: new Date().toISOString()
        });

                return {
          success: true,
          orderId,
          paymentId: result.paymentId
        };
      } else {
        const failureMessage = result.errorMessage || 'Payment failed';

        // Cancel the order AND release the stock that was reserved at
        // checkout — otherwise a failed payment locks inventory forever.
        try {
          await cancelOrder(orderId, failureMessage, { paymentFailed: true });
        } catch (cancelError) {
          console.error('[PaymentService.handleCallback] Failed to cancel order:', cancelError);
          await this.updateOrderPaymentFailure(orderId, failureMessage);
        }

                return {
          success: false,
          orderId,
          error: failureMessage
        };
      }
    } catch (error) {
      console.error('[PaymentService.handleCallback] EXCEPTION:', error);
      return {
        success: false,
        error: 'Payment callback processing failed'
      };
    }
  }

  /**
   * Get order details with items
   */
  private async getOrderDetails(orderId: string) {
    const supabase = await createClient();

    const { data: order, error: orderError } = await (supabase
      .from('orders') as any)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return null;
    }

    const { data: items, error: itemsError } = await (supabase
      .from('order_items') as any)
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      return null;
    }

    // Store orders contain no `order_items` rows; without these, iyzico gets
    // an empty basket and rejects the payment.
    const { data: storeItems } = await (supabase
      .from('store_order_items') as any)
      .select('*')
      .eq('order_id', orderId);

    let { data: user, error: userError } = await (supabase
      .from('users') as any)
      .select('email, full_name, identity_number')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('id', (order as any).user_id)
      .single();

    // `users.identity_number` ships with migration 092. Until it is applied the
    // select fails, which used to surface as "Order not found" on checkout.
    // Degrade to the columns that do exist; mapBuyer then reports the real
    // problem (missing TCKN) instead of a misleading order error.
    if (userError && isMissingColumnError(userError, 'identity_number')) {
      ({ data: user, error: userError } = await (supabase
        .from('users') as any)
        .select('email, full_name')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('id', (order as any).user_id)
        .single());
    }

    if (userError) {
      return null;
    }

    return {
      ...(order as unknown as Record<string, unknown>),
      items: items || [],
      storeItems: storeItems || [],
      user: user || {}
    } as unknown as { total_amount: number; shipping_address: Record<string, unknown>; user: Record<string, unknown>; items: Record<string, unknown>[]; storeItems: Record<string, unknown>[]; };
  }

  /**
   * Map order data to iyzico buyer format
   */
  private mapBuyer(order: Record<string, unknown>) {
    const shippingAddress = (order.shipping_address as Record<string, unknown>) || {};
    const user = (order.user as Record<string, unknown>) || {};

    const fullName = String(shippingAddress.fullName || user.full_name || '').trim();
    if (!fullName) {
      throw new Error('Ödeme için alıcı adı soyadı gereklidir.');
    }
    const [firstName, ...lastNameParts] = fullName.split(/\s+/);

    const identityNumber = String(user.identity_number || '').trim();
    // Turkish ID numbers are 11 digits and never start with 0.
    if (!/^[1-9]\d{10}$/.test(identityNumber)) {
      throw new Error(
        'Ödeme yapabilmek için hesabınıza geçerli bir TC kimlik numarası eklemelisiniz (Ayarlar > Profil Bilgileri).'
      );
    }

    const phone = String(shippingAddress.phone || '').trim();
    if (phone.length < 10) {
      throw new Error('Ödeme için geçerli bir telefon numarası gereklidir.');
    }

    const registrationAddress = this.formatAddressLine(shippingAddress);
    const city = String(shippingAddress.city || '').trim();
    const zipCode = String(shippingAddress.zipCode || shippingAddress.postal_code || '').trim();

    if (!registrationAddress || !city) {
      throw new Error('Ödeme için teslimat adresi eksiksiz olmalıdır.');
    }

    return {
      id: order.user_id,
      name: firstName,
      surname: lastNameParts.join(' ') || firstName,
      gsmNumber: phone,
      email: (user.email as string) || '',
      identityNumber,
      registrationAddress,
      city,
      country: 'Turkey',
      zipCode,
    };
  }

  /**
   * Map shipping address to iyzico format
   */
  private mapAddress(address: Record<string, unknown> | undefined) {
    const registrationAddress = this.formatAddressLine(address || {});
    const city = String(address?.city || '').trim();
    const zipCode = String(address?.zipCode || address?.postal_code || '').trim();
    const contactName = String(address?.fullName || address?.full_name || '').trim();

    if (!registrationAddress || !city || !contactName) {
      throw new Error('Ödeme için teslimat adresi eksiksiz olmalıdır.');
    }

    return {
      contactName,
      city,
      country: 'Turkey',
      address: registrationAddress,
      zipCode,
    };
  }

  /**
   * Build a single address line from the structured checkout address.
   */
  private formatAddressLine(address: Record<string, unknown>): string {
    const parts = [
      address.neighborhood,
      address.street,
      address.buildingNo ? `No:${address.buildingNo}` : null,
      address.apartmentNo ? `D:${address.apartmentNo}` : null,
      address.district,
    ]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map((part) => part.trim());

    if (parts.length > 0) return parts.join(', ');

    return String(address.address_line1 || address.address || '').trim();
  }

  /**
   * Map order items to iyzico basket items
   * Note: iyzico requires basketItems total to equal order total_amount
   * So we include shipping and tax as separate items
   */
  private mapBasketItems(items: Record<string, unknown>[], order: Record<string, unknown>) {
    const basketItems = items.map(item => ({
      id: item.id,
      name: (item.filename as string) || 'STL File',
      category1: '3D Baskı',
      category2: (item.material_name as string),
      itemType: BASKET_ITEM_TYPE.PHYSICAL,
      price: Number(item.subtotal).toFixed(2)
    }));

    // Store products live in a separate table and must also be sent, otherwise
    // a store-only order produces an empty basket and iyzico rejects it.
    const storeItems = (order.storeItems as Record<string, unknown>[] | undefined) || [];
    for (const item of storeItems) {
      basketItems.push({
        id: String(item.id),
        name: (item.product_name as string) || 'Urun',
        category1: 'Magaza',
        category2: (item.sku as string) || 'Urun',
        itemType: BASKET_ITEM_TYPE.PHYSICAL,
        price: Number(item.subtotal).toFixed(2)
      });
    }

    // Add shipping cost as separate item if exists
    const shippingCost = Number(order.shipping_cost || 0);
    if (shippingCost > 0) {
      basketItems.push({
        id: 'shipping',
        name: 'Kargo Ücreti',
        category1: 'Kargo',
        category2: 'Teslimat',
        itemType: BASKET_ITEM_TYPE.PHYSICAL,
        price: shippingCost.toFixed(2)
      });
    }

    // Add tax as separate item if exists
    const taxAmount = Number(order.tax_amount || 0);
    if (taxAmount > 0) {
      basketItems.push({
        id: 'tax',
        name: 'KDV',
        category1: 'Vergi',
        category2: 'KDV',
        itemType: BASKET_ITEM_TYPE.PHYSICAL,
        price: taxAmount.toFixed(2)
      });
    }

    // iyzico rejects the request when basket total != paidPrice. Rounding at
    // the item level makes small differences inevitable, so correct the last
    // item instead of failing the payment.
    const paidPrice = Math.round(Number(order.total_amount || 0) * 100) / 100;
    const basketTotal =
      basketItems.reduce((sum, item) => sum + Math.round(Number(item.price) * 100), 0) / 100;
    const diff = Math.round((paidPrice - basketTotal) * 100) / 100;

    if (diff !== 0 && basketItems.length > 0) {
      const last = basketItems[basketItems.length - 1];
      const corrected = Math.round((Number(last.price) + diff) * 100) / 100;
      if (corrected > 0) {
        last.price = corrected.toFixed(2);
      } else {
        console.error('[PaymentService] Basket total mismatch cannot be corrected:', {
          paidPrice,
          basketTotal,
        });
      }
    }

    return basketItems;
  }

  /**
   * Update order with payment token
   */
  private async updateOrderPaymentToken(orderId: string, token: string) {
    // Service client: the callback runs without a user session, and a token
    // that silently fails to persist breaks the idempotency + token/order
    // match checks.
    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any)
      .update({
        payment_token: token,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      console.error('[PaymentService] Could not persist payment token:', orderId, error);
    }
  }

  /**
   * Ensure the callback token actually belongs to the order we are about to
   * mutate. Prevents a valid token from one order being replayed against
   * another order id.
   */
  private async findOrderForToken(orderId: string, token: string): Promise<{ id: string; payment_status: string } | null> {
    const supabase = createServiceClient();

    const { data, error } = await (supabase.from('orders') as any)
      .select('id, payment_token, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) {
      console.error('[PaymentService] Order lookup failed:', orderId, error);
      return null;
    }

    if (data.payment_token && data.payment_token !== token) {
      return null;
    }

    return data;
  }

  /**
   * Update order with successful payment
   */
  private async updateOrderPaymentSuccess(orderId: string, paymentData: { paymentId: string; paymentMethod: string; paymentDate: string }) {
            // Use service client to bypass RLS (callback has no auth context)
    const supabase = createServiceClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedRows, error } = await (supabase.from('orders') as any)
      .update({
        status: 'payment_received',
        payment_status: 'paid',
        payment_id: paymentData.paymentId,
        payment_method: paymentData.paymentMethod,
        payment_date: paymentData.paymentDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select('id');

    if (error) {
      console.error('[PaymentService.updateOrderPaymentSuccess] ❌ ERROR updating order:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.error('[PaymentService.updateOrderPaymentSuccess] ❌ No order matched:', orderId);
      throw new Error('Payment success could not be recorded: order not found');
    }
    
        // Verify the update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: verifyError } = await (supabase.from('orders') as any)
      .select('status, payment_status, payment_id')
      .eq('id', orderId)
      .single();
    
    if (verifyError) {
      console.error('[PaymentService.updateOrderPaymentSuccess] ❌ Verification failed:', verifyError);
    } else {
          }

    // Send order confirmation email after successful payment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: completeOrder, error: orderError } = await (supabase.from('orders') as any)
      .select(`
        *,
        user:users(email, full_name),
        items:order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('[PaymentService.updateOrderPaymentSuccess] ❌ Failed to fetch order for email:', orderError);
    } else if (completeOrder) {
      mailService.sendOrderConfirmation(completeOrder)
        .then((result) => {
          if (!result.success) {
            console.warn('[PaymentService] Order confirmation email not sent:', result.error);
          }
        })
        .catch(error => {
          console.error('[PaymentService.updateOrderPaymentSuccess] ❌ Failed to send email:', error);
        });
    } else {
      console.error('[PaymentService.updateOrderPaymentSuccess] ❌ Complete order data is null');
    }
  }

  /**
   * Update order with failed payment
   */
  private async updateOrderPaymentFailure(orderId: string, errorMessage: string) {
        // Use service client to bypass RLS (callback has no auth context)
    const supabase = createServiceClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any)
      .update({
        payment_status: 'failed',
        payment_error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('[PaymentService.updateOrderPaymentFailure] ❌ ERROR updating order:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }
    
      }
}

export const paymentService = new PaymentService();
