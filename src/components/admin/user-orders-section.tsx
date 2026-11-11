'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart, ChevronDown, ChevronRight, FileText, ExternalLink } from 'lucide-react';

interface OrderItem {
  id: string; file_id: string; filename: string; material_name: string;
  print_setting_name: string; quantity: number; unit_price: number; subtotal: number;
}

interface Order {
  id: string; order_number: string; status: string; payment_status: string;
  total_amount: number; created_at: string; order_items: OrderItem[];
}

interface UserOrdersSectionProps { orders: Order[]; }

const orderStatusLabels: Record<string, string> = {
  pending: 'Beklemede', payment_received: 'Ödeme Alındı', preparing: 'Hazırlanıyor',
  printing: 'Baskıda', quality_check: 'Kalite Kontrolü', packaging: 'Paketleniyor',
  shipped: 'Kargoda', delivered: 'Teslim Edildi', cancelled: 'İptal Edildi', refunded: 'İade Edildi',
};

const paymentStatusLabels: Record<string, string> = { pending: 'Beklemede', paid: 'Ödendi', failed: 'Başarısız', refunded: 'İade Edildi' };

const orderStatusColors: Record<string, string> = {
  pending: 'bg-gray-500/10 text-gray-600', payment_received: 'bg-blue-500/10 text-blue-600',
  preparing: 'bg-cyan-500/10 text-cyan-600', printing: 'bg-orange-500/10 text-orange-600',
  quality_check: 'bg-purple-500/10 text-purple-600', packaging: 'bg-yellow-500/10 text-yellow-600',
  shipped: 'bg-blue-500/10 text-blue-600', delivered: 'bg-emerald-500/10 text-emerald-600',
  cancelled: 'bg-red-500/10 text-red-600', refunded: 'bg-red-500/10 text-red-600',
};

export function UserOrdersSection({ orders }: UserOrdersSectionProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const sorted = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalItems = sorted.reduce((sum, o) => sum + (o.order_items || []).reduce((s, i) => s + i.quantity, 0), 0);

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
              Sipariş Geçmişi
            </CardTitle>
            <CardDescription className="text-xs">{sorted.length} sipariş, {totalItems} ürün</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-6">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz sipariş vermemiş</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((order) => (
              <div key={order.id} className="rounded-xl border border-border/40 overflow-hidden">
                <div
                  className="flex items-center gap-3 p-3 sm:p-4 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => toggleOrder(order.id)}
                >
                  <button className="p-0.5 hover:bg-muted rounded shrink-0">
                    {expandedOrders.has(order.id) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs sm:text-sm font-semibold">#{order.order_number}</span>
                      <Badge variant="outline" className={`text-[10px] h-4 px-1 ${orderStatusColors[order.status] || ''}`}>
                        {orderStatusLabels[order.status] || order.status}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] h-4 px-1 ${
                        order.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                        order.payment_status === 'failed' ? 'bg-red-500/10 text-red-600' : 'bg-gray-500/10 text-gray-600'
                      }`}>
                        {paymentStatusLabels[order.payment_status] || order.payment_status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      <span>{new Date(order.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="font-semibold text-foreground">₺{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" asChild onClick={(e) => e.stopPropagation()}>
                    <Link href={`/admin/orders/${order.id}`}><ExternalLink className="h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
                {expandedOrders.has(order.id) && (order.order_items || []).length > 0 && (
                  <div className="px-3 sm:px-4 py-3 space-y-1.5 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-medium mb-1.5">
                      <FileText className="h-3 w-3 shrink-0" />Sipariş Kalemleri
                    </div>
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2 rounded-lg bg-background/80 text-[11px] sm:text-xs">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1">
                          <span className="font-medium truncate max-w-[120px] sm:max-w-[200px]">{item.filename}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{item.material_name}</Badge>
                          <span className="text-muted-foreground">{item.print_setting_name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-muted-foreground">x{item.quantity}</span>
                          <span className="font-semibold">₺{item.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
