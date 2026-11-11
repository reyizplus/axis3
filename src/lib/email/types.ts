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
  orderDate: string;
  totalAmount: number;
  totalPrice: number; // Added for OrderConfirmation template compatibility
  items: OrderItemEmailData[];
  deliveryAddress: string;
  estimatedDeliveryDate: string;
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
  oldStatus: string;
  newStatus: string;
  statusMessage: string;
  totalPrice: number;
  estimatedDeliveryDate?: string;
  trackingNumber?: string;
  cargoCompany?: string;
  items: { fileName: string; quantity: number; }[];
  userEmail: string;
  userName: string;
}

export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'printing'
  | 'quality_check'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export const ORDER_STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: 'Siparişiniz alındı ve işleme alınmayı bekliyor.',
  processing: 'Siparişiniz işleme alındı. Baskı hazırlıkları yapılıyor.',
  printing: 'Baskı işlemi başladı. Modelleriniz üretiliyor.',
  quality_check: 'Baskı tamamlandı. Kalite kontrolü yapılıyor.',
  shipped: 'Siparişiniz kargoya verildi. Yakında elinizde olacak!',
  completed: 'Siparişiniz teslim edildi. Teşekkür ederiz!',
  cancelled: 'Siparişiniz iptal edildi.',
};
