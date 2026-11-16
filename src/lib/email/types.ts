/**
 * Email Type Definitions
 * Axis3 - Email Notification System
 */

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OrderEmailData {
  orderNumber: string;
  /** Order creation date, already formatted for display (e.g. "1 Kasım 2026"). */
  orderDate: string;
  totalAmount: number;
  totalPrice: number; // Added for OrderConfirmation template compatibility
  /** Applied coupon discount in TL (0 when no coupon was used). */
  discountAmount: number;
  /** Coupon code shown next to the discount line, when present. */
  couponCode: string | null;
  items: OrderItemEmailData[];
  /** Formatted, human readable shipping address (newlines allowed). */
  deliveryAddress: string;
  /** Formatted estimated delivery date, when known. */
  estimatedDeliveryDate?: string;
  /** Absolute URL of the customer's order list. */
  dashboardUrl: string;
  userEmail: string;
  userName: string;
}

export interface OrderItemEmailData {
  fileName: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderStatusEmailData {
  orderNumber: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  statusMessage: string;
  totalPrice: number;
  estimatedDeliveryDate?: string;
  trackingNumber?: string;
  cargoCompany?: string;
  items: { fileName: string; quantity: number; }[];
  /** Absolute URL of this specific order in the dashboard. */
  dashboardUrl: string;
  userEmail: string;
  userName: string;
}

/**
 * Statuses allowed by the `orders.status` CHECK constraint
 * (see supabase/migrations/001_initial_schema.sql).
 */
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

export const ORDER_STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: 'Siparişiniz alındı ve ödeme onayı bekleniyor.',
  payment_received: 'Ödemeniz onaylandı. Siparişiniz üretim sırasına alındı.',
  preparing: 'Siparişiniz işleme alındı. Baskı hazırlıkları yapılıyor.',
  printing: 'Baskı işlemi başladı. Modelleriniz üretiliyor.',
  quality_check: 'Baskı tamamlandı. Kalite kontrolü yapılıyor.',
  packaging: 'Siparişiniz paketleniyor ve kargoya hazırlanıyor.',
  shipped: 'Siparişiniz kargoya verildi. Yakında elinizde olacak!',
  delivered: 'Siparişiniz teslim edildi. Teşekkür ederiz!',
  cancelled: 'Siparişiniz iptal edildi.',
  refunded: 'Sipariş tutarı iade edildi.',
};
