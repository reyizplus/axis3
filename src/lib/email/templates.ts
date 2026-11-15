/**
 * Email Template Helpers
 * Axis3 - Email Notification System
 * 
 * Helper functions for email template generation
 */

import { OrderEmailData, OrderStatusEmailData, ORDER_STATUS_MESSAGES } from './types';

/**
 * Format currency (TRY)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

/**
 * Format date (Turkish locale)
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Get order status message
 */
export function getStatusMessage(status: string): string {
  return ORDER_STATUS_MESSAGES[status as keyof typeof ORDER_STATUS_MESSAGES] || 'Sipariş durumu güncellendi.';
}

/**
 * Get dashboard URL
 */
export function getDashboardUrl(orderId?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  return orderId 
    ? `${baseUrl}/dashboard/orders/${orderId}`
    : `${baseUrl}/dashboard/orders`;
}

/**
 * Prepare order email data
 */
export function prepareOrderEmailData(order: any): OrderEmailData {
  return {
    orderNumber: order.order_number,
    orderDate: order.created_at,
    totalAmount: order.total_price || order.total_amount,
    totalPrice: order.total_price || order.total_amount, // Added for compatibility
    discountAmount: Number(order.discount_amount) || 0,
    couponCode: order.coupon_code || null,
    items: order.items?.map((item: any) => ({
      fileName: item.file_name || item.file?.original_filename || 'Model',
      materialName: item.material_name || item.material?.name || 'Malzeme',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.subtotal || item.total_price,
    })) || [],
    deliveryAddress: order.delivery_address || 'Belirtilmedi',
    estimatedDeliveryDate: order.estimated_delivery || order.estimated_delivery_date,
    userEmail: order.user_email || order.user?.email || '',
    userName: order.user_name || order.user?.full_name || 'Değerli Müşterimiz',
  };
}

/**
 * Prepare order status email data
 */
export function prepareOrderStatusEmailData(
  order: any,
  oldStatus: string
): OrderStatusEmailData {
  return {
    orderNumber: order.order_number,
    oldStatus,
    newStatus: order.status,
    statusMessage: getStatusMessage(order.status),
    totalPrice: order.total_price || order.total_amount || 0,
    estimatedDeliveryDate: order.estimated_delivery || order.estimated_delivery_date,
    trackingNumber: order.tracking_number,
    cargoCompany: order.cargo_company,
    items: order.items?.map((item: any) => ({
      fileName: item.file_name || item.file?.original_filename || 'Model',
      quantity: item.quantity || 1,
    })) || [],
    userEmail: order.user_email || order.user?.email || '',
    userName: order.user_name || order.user?.full_name || 'Değerli Müşterimiz',
  };
}
