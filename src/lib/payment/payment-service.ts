/**
 * Payment Service
 * Axis3 - iyzico Payment Integration
 * 
 * This service handles all payment-related operations including:
 * - Payment initialization
 * - Payment callback handling
 * - Payment status retrieval
 */

import { iyzipayClient, BASKET_ITEM_TYPE, PAYMENT_CONFIG } from './iyzico-client';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { mailService } from '@/lib/services/mail-service';

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
        iyzipayClient.checkoutFormInitialize.create(request as any, (err: any, result: any) => {
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
        iyzipayClient.checkoutForm.retrieve({ token }, (err: any, result: any) => {
          if (err) {
            console.error('[PaymentService.handleCallback] iyzico API error:', err);
            reject(err);
          } else {
                        resolve(result);
          }
        });
      });

      // iyzico returns order ID in basketId field, not conversationId
      const orderId = result.basketId || result.conversationId;
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
                        // Update order with payment failure
        await this.updateOrderPaymentFailure(orderId, result.errorMessage || 'Payment failed');

                return {
          success: false,
          orderId,
          error: result.errorMessage || 'Payment failed'
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

    const { data: user, error: userError } = await (supabase
      .from('users') as any)
      .select('email, full_name')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('id', (order as any).user_id)
      .single();

    if (userError) {
      return null;
    }

    return {
      ...(order as unknown as Record<string, unknown>),
      items: items || [],
      user: user || {}
    } as unknown as { total_amount: number; shipping_address: Record<string, unknown>; user: Record<string, unknown>; items: Record<string, unknown>[]; };
  }

  /**
   * Map order data to iyzico buyer format
   */
  private mapBuyer(order: Record<string, unknown>) {
    const shippingAddress = (order.shipping_address as Record<string, unknown>) || {};
    const fullName = (shippingAddress.full_name as string) || ((order.user as Record<string, unknown>)?.full_name as string) || 'Test User';
    const [firstName, ...lastNameParts] = fullName.split(' ');
    
    // Fallback to address field if address_line1 doesn't exist
    const registrationAddress = (shippingAddress.address_line1 as string) || (shippingAddress.address as string) || 'Test Address, Test Street No:1';
    const city = (shippingAddress.city as string) || 'Istanbul';
    const zipCode = (shippingAddress.postal_code as string) || '34000';
    
    return {
      id: order.user_id,
      name: firstName,
      surname: lastNameParts.join(' ') || 'User',
      gsmNumber: (shippingAddress.phone as string) || '+905555555555',
      email: ((order.user as Record<string, unknown>)?.email as string) || 'test@example.com',
      identityNumber: '11111111111', // Test için - production'da gerçek TC kimlik no
      registrationAddress,
      city,
      country: 'Turkey',
      zipCode
    };
  }

  /**
   * Map shipping address to iyzico format
   */
  private mapAddress(address: Record<string, unknown> | undefined) {
    // Fallback to address field if address_line1 doesn't exist
    const addressLine = address?.address_line1 || address?.address || 'Test Address, Test Street No:1';
    const city = address?.city || 'Istanbul';
    const zipCode = address?.postal_code || '34000';
    const contactName = address?.full_name || 'Test User';
    
    return {
      contactName,
      city,
      country: 'Turkey',
      address: addressLine,
      zipCode
    };
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
      price: (item.subtotal as number).toFixed(2)
    }));

    // Add shipping cost as separate item if exists
    const shippingCost = order.shipping_cost as number;
    if (shippingCost && shippingCost > 0) {
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
    const taxAmount = order.tax_amount as number;
    if (taxAmount && taxAmount > 0) {
      basketItems.push({
        id: 'tax',
        name: 'KDV',
        category1: 'Vergi',
        category2: 'KDV',
        itemType: BASKET_ITEM_TYPE.PHYSICAL,
        price: taxAmount.toFixed(2)
      });
    }

    return basketItems;
  }

  /**
   * Update order with payment token
   */
  private async updateOrderPaymentToken(orderId: string, token: string) {
    const supabase = await createClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('orders') as any)
      .update({
        payment_token: token,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
  }

  /**
   * Update order with successful payment
   */
  private async updateOrderPaymentSuccess(orderId: string, paymentData: { paymentId: string; paymentMethod: string; paymentDate: string }) {
            // Use service client to bypass RLS (callback has no auth context)
    const supabase = createServiceClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any)
      .update({
        status: 'payment_received',
        payment_status: 'paid',
        payment_id: paymentData.paymentId,
        payment_method: paymentData.paymentMethod,
        payment_date: paymentData.paymentDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('[PaymentService.updateOrderPaymentSuccess] ❌ ERROR updating order:', error);
      throw new Error(`Failed to update order: ${error.message}`);
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
        .then(() => {
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
