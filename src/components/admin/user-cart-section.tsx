'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, Layers, Printer, Clock, DollarSign, FileText } from 'lucide-react';

export interface CartItemRecord {
  id: string; cart_id: string; file_id: string | null; filename: string;
  volume_cm3: number | null; material_id: string; material_name: string;
  print_setting_id: string; print_setting_name: string; quantity: number;
  unit_price: number; total_price: number; estimated_time: number | null;
  technology: 'FDM' | 'SLA' | null; color: string | null;
  nozzle_size_id: string | null; nozzle_size_mm: number | null;
  is_preorder: boolean | null; preorder_discount_percent: number | null;
  estimated_restock_days: number | null; custom_layer_height: number | null;
  custom_infill_percentage: number | null; custom_time_multiplier: number | null;
  custom_layer_thickness: number | null; custom_exposure_time: number | null;
  delivery_days: number | null; created_at: string;
  _item_type?: '3d_print' | 'store'; _store_product_slug?: string; _store_image_url?: string | null;
}

export interface CartRecord {
  id: string; user_id: string; created_at: string; updated_at: string;
  items: CartItemRecord[]; totalPrice: number; totalItems: number;
}

interface UserCartSectionProps { cart: CartRecord | null; }

export function UserCartSection({ cart }: UserCartSectionProps) {
  if (!cart || cart.items.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
            Sepet
          </CardTitle>
          <CardDescription className="text-xs">Kullanıcının aktif sepeti</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6">
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Sepet Boş</p>
            <p className="text-xs mt-1">Kullanıcının sepetinde ürün bulunmuyor</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgItemPrice = cart.items.length > 0 ? cart.totalPrice / cart.items.length : 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Toplam Ürün</span>
          </div>
          <span className="text-sm sm:text-lg font-bold">{cart.totalItems}</span>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Toplam</span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-primary">₺{cart.totalPrice.toFixed(2)}</p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Kalem</span>
          </div>
          <span className="text-sm sm:text-lg font-bold">{cart.items.length}</span>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Ort. Fiyat</span>
          </div>
          <p className="text-sm sm:text-lg font-bold">₺{avgItemPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Items */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
            Sepet İçeriği ({cart.items.length} kalem)
          </CardTitle>
          <CardDescription className="text-xs">
            Son: {new Date(cart.updated_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6">
          <div className="space-y-2">
            {cart.items.map((item) => (
              <div key={item.id} className="p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    {item._item_type === 'store' ? (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ShoppingCart className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-[250px]">{item.filename}</span>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px] h-4 px-1 shrink-0">Mağaza</Badge>
                        </div>
                        {item._store_product_slug && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Ürün Kodu: {item._store_product_slug}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-[250px]">{item.filename}</span>
                          {item.is_preorder && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 text-[10px] h-4 px-1 shrink-0">Ön Sipariş</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3 shrink-0" />{item.material_name}</span>
                          <span className="flex items-center gap-1"><Printer className="h-3 w-3 shrink-0" />{item.print_setting_name}</span>
                          {item.technology && <span>{item.technology}</span>}
                          {item.color && item.color !== 'Natural' && <span>Renk: {item.color}</span>}
                          {item.volume_cm3 != null && <span>{item.volume_cm3.toFixed(1)} cm³</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
                          <span>Adet: <strong>{item.quantity}</strong></span>
                          <span>Birim: <strong>₺{item.unit_price.toFixed(2)}</strong></span>
                          {item.estimated_time != null && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />~{item.estimated_time.toFixed(1)}s</span>
                          )}
                        </div>
                        {item.custom_layer_height != null && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground pt-0.5 border-t border-border/30">
                            {item.custom_layer_height != null && <span>Katman: {item.custom_layer_height}mm</span>}
                            {item.custom_infill_percentage != null && <span>Doluluk: %{item.custom_infill_percentage}</span>}
                            {item.nozzle_size_mm != null && <span>Nozul: {item.nozzle_size_mm}mm</span>}
                            {item.custom_time_multiplier != null && <span>Süre: x{item.custom_time_multiplier}</span>}
                            {item.custom_layer_thickness != null && <span>Tabaka: {item.custom_layer_thickness}mm</span>}
                            {item.custom_exposure_time != null && <span>Pozlama: {item.custom_exposure_time}s</span>}
                          </div>
                        )}
                        {item.is_preorder && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-amber-600">
                            {item.preorder_discount_percent != null && <span>İndirim: %{item.preorder_discount_percent}</span>}
                            {item.estimated_restock_days != null && <span>Tahmini Stok: {item.estimated_restock_days} gün</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs sm:text-sm font-bold text-primary">₺{item.total_price.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{item.quantity} adet</p>
                  </div>
                </div>
                {item.delivery_days != null && item._item_type !== 'store' && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>Tahmini Teslimat: <strong>{item.delivery_days} gün</strong></span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
