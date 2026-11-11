import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Package,
  Eye,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { OrderStatus } from '@/lib/services/order-service';

export interface StatusConfig {
  label: string;
  color: string;
  dotColor: string;
  icon: LucideIcon;
}

export const statusConfig: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: 'Beklemede',
    color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    dotColor: 'bg-yellow-500',
    icon: Clock,
  },
  payment_received: {
    label: 'Ödeme Alındı',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  preparing: {
    label: 'Hazırlanıyor',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    dotColor: 'bg-blue-500',
    icon: TrendingUp,
  },
  printing: {
    label: 'Baskıda',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    dotColor: 'bg-purple-500',
    icon: Package,
  },
  quality_check: {
    label: 'Kalite Kontrol',
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    dotColor: 'bg-indigo-500',
    icon: Eye,
  },
  washing: {
    label: 'Yıkamada',
    color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    dotColor: 'bg-sky-500',
    icon: Clock,
  },
  curing: {
    label: 'Kürlemede',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    dotColor: 'bg-amber-500',
    icon: Clock,
  },
  packaging: {
    label: 'Paketleniyor',
    color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
    dotColor: 'bg-violet-500',
    icon: Package,
  },
  shipped: {
    label: 'Kargoda',
    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    dotColor: 'bg-cyan-500',
    icon: Package,
  },
  delivered: {
    label: 'Teslim Edildi',
    color: 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20',
    dotColor: 'bg-green-500',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'İptal Edildi',
    color: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
    dotColor: 'bg-red-500',
    icon: XCircle,
  },
  refunded: {
    label: 'İade Edildi',
    color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
    dotColor: 'bg-orange-500',
    icon: XCircle,
  },
};

export const statusFlow: OrderStatus[] = [
  'pending',
  'payment_received',
  'preparing',
  'printing',
  'quality_check',
  'washing',
  'curing',
  'packaging',
  'shipped',
  'delivered',
];
