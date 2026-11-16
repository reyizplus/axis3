/**
 * Email Template Helpers
 * Axis3 - Email Notification System
 *
 * Helper functions for email template generation
 */

import { OrderEmailData, OrderStatusEmailData, ORDER_STATUS_MESSAGES } from './types';

const FALLBACK_APP_URL = 'http://localhost:3000';

/** Public base URL of the storefront, without a trailing slash. */
export function getAppUrl(): string {
  // Single source of truth: NEXT_PUBLIC_APP_URL. NEXT_PUBLIC_URL is a payment
  // callback legacy variable and must not decide where e-mail links point.
  const url = process.env.NEXT_PUBLIC_APP_URL || FALLBACK_APP_URL;

  return url.replace(/\/+$/, '');
}

/**
 * Format date (Turkish locale). Accepts ISO timestamps and DATE values.
 *
 * DATE values (YYYY-MM-DD) are parsed as local calendar dates: parsing them
 * with `new Date('2026-11-08')` treats them as UTC midnight, which shows the
 * previous day on servers in a negative timezone.
 */
export function formatDate(date: string | Date | null | undefined): string | undefined {
  if (!date) return undefined;

  let dateObj: Date;

  if (typeof date === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    dateObj = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(date);
  } else {
    dateObj = date;
  }

  if (Number.isNaN(dateObj.getTime())) return undefined;

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
 * Get the dashboard order list URL, or a specific order when an id is given.
 */
export function getDashboardUrl(orderId?: string): string {
  const baseUrl = getAppUrl();
  return orderId
    ? `${baseUrl}/dashboard/orders/${orderId}`
    : `${baseUrl}/dashboard/orders`;
}

/**
 * Turn the JSONB `orders.shipping_address` value into printable lines.
 *
 * New orders store `{ fullName, phone, city, district, neighborhood, street,
 * buildingNo, apartmentNo, zipCode, notes }`; older rows may store a single
 * `{ address, notes }` object or plain text.
 */
export function formatAddress(address: unknown): string {
  if (!address) return 'Belirtilmedi';

  if (typeof address === 'string') {
    return address.trim() || 'Belirtilmedi';
  }

  if (typeof address !== 'object') return 'Belirtilmedi';

  const value = address as Record<string, unknown>;

  if (typeof value.address === 'string' && !value.street && !value.city) {
    const lines = [
      value.address.trim(),
      typeof value.notes === 'string' && value.notes.trim() ? `Not: ${value.notes.trim()}` : '',
    ].filter(Boolean);

    return lines.length > 0 ? lines.join('\n') : 'Belirtilmedi';
  }

  const asText = (input: unknown) => (typeof input === 'string' ? input.trim() : '');

  const street = [
    asText(value.street),
    asText(value.buildingNo) ? `No: ${asText(value.buildingNo)}` : '',
    asText(value.apartmentNo) ? `Daire: ${asText(value.apartmentNo)}` : '',
  ].filter(Boolean).join(' ');

  const region = [
    asText(value.neighborhood),
    asText(value.district),
    asText(value.city),
  ].filter(Boolean).join(', ');

  const regionWithZip = [region, asText(value.zipCode)].filter(Boolean).join(' ');

  const lines = [
    asText(value.fullName),
    street,
    regionWithZip,
    asText(value.phone),
    asText(value.notes) ? `Not: ${asText(value.notes)}` : '',
  ].filter(Boolean);

  return lines.length > 0 ? lines.join('\n') : 'Belirtilmedi';
}

function resolveItemName(item: Record<string, any>): string {
  return (
    item.filename ||
    item.file_name ||
    item.file?.original_filename ||
    item.name ||
    '3D Model'
  );
}

/**
 * Prepare order email data
 */
export function prepareOrderEmailData(order: any): OrderEmailData {
  const items = (order.items ?? []).map((item: any) => {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price) || 0;
    const totalPrice = Number(item.subtotal ?? item.total_price ?? unitPrice * quantity) || 0;

    return {
      fileName: resolveItemName(item),
      materialName: item.material_name || item.material?.name || 'Malzeme',
      quantity,
      unitPrice,
      totalPrice,
    };
  });

  const totalPrice = Number(order.total_amount ?? order.total_price ?? 0);

  return {
    orderNumber: order.order_number,
    orderDate: formatDate(order.created_at) || '',
    totalAmount: totalPrice,
    totalPrice,
    discountAmount: Number(order.discount_amount) || 0,
    couponCode: order.coupon_code || null,
    items,
    deliveryAddress: formatAddress(order.shipping_address ?? order.delivery_address),
    estimatedDeliveryDate: formatDate(order.estimated_delivery ?? order.estimated_delivery_date),
    dashboardUrl: getDashboardUrl(),
    userEmail: order.user_email || order.user?.email || '',
    userName: order.user_name || order.user?.full_name || 'Değerli Müşterimiz',
  };
}

/**
 * Prepare order status email data
 */
export function prepareOrderStatusEmailData(
  order: any,
  oldStatus: string,
  options: { includeTracking?: boolean } = {}
): OrderStatusEmailData {
  const includeTracking = options.includeTracking !== false;

  return {
    orderNumber: order.order_number,
    orderId: order.id,
    oldStatus,
    newStatus: order.status,
    statusMessage: getStatusMessage(order.status),
    totalPrice: Number(order.total_amount ?? order.total_price ?? 0),
    estimatedDeliveryDate: formatDate(order.estimated_delivery ?? order.estimated_delivery_date),
    trackingNumber: includeTracking ? order.tracking_number : undefined,
    cargoCompany: includeTracking ? order.cargo_company : undefined,
    items: (order.items ?? []).map((item: any) => ({
      fileName: resolveItemName(item),
      quantity: Number(item.quantity) || 1,
    })),
    dashboardUrl: getDashboardUrl(order.id),
    userEmail: order.user_email || order.user?.email || '',
    userName: order.user_name || order.user?.full_name || 'Değerli Müşterimiz',
  };
}
