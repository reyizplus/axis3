/**
 * Stok tahsisi ve stok dusme cagrisinin saf (DB'siz) kurallari.
 *
 * Iki ayri uretim hatasindan dogdu:
 *
 * 1. `deduct_inventory_stock` cagrisina kalemin nozul kimligi gonderiliyordu.
 *    Envanter satirlari malzeme+renk kovasidir ve `nozzle_size_id` onlarda
 *    NULL'dir; SQL fonksiyonu `nozzle_size_id = p_nozzle_size_id` ile tam
 *    eslesme aradigi icin `NULL = <uuid>` asla dogru olmuyor, stok DOLU olsa
 *    bile `short` donuyordu. Siparis `"<dosya>.stl" icin stok tukendi` (409)
 *    ile dusuyor ve her denemede ayni sekilde tekrarliyordu.
 *
 * 2. Stok kontrolu kalem kalem yapiliyordu; ayni malzeme+renkten iki kalem
 *    varsa ikisi de "stok var" diyor, ikincisi dusme adiminda patliyordu.
 *    Talep sepet genelinde sirayla paylastirilmalidir.
 */

export type DeductionArgs = {
  p_material_id: string;
  p_color: string | null;
  p_quantity: number;
  p_nozzle_size_id: null;
  p_technology: 'FDM' | 'SLA';
  p_order_id?: string;
  p_order_item_id?: string | null;
};

/**
 * `deduct_inventory_stock` parametreleri.
 *
 * `p_nozzle_size_id` her zaman `null`: filament/resin tuketimi nozuldan
 * bagimsizdir, nozul stogu ayri bir `type='nozzle'` kaydidir.
 */
export function inventoryDeductionArgs(
  item: {
    materialId: string;
    color: string | null;
    quantity: number;
    technology: 'FDM' | 'SLA';
  },
  order?: { orderId?: string; orderItemId?: string | null }
): DeductionArgs {
  const args: DeductionArgs = {
    p_material_id: item.materialId,
    p_color: item.color,
    p_quantity: item.quantity,
    p_nozzle_size_id: null,
    p_technology: item.technology,
  };
  if (order?.orderId) {
    args.p_order_id = order.orderId;
    args.p_order_item_id = order.orderItemId ?? null;
  }
  return args;
}

/**
 * Ayni malzeme+renk grubundaki onceki kalemlerin aldigi stok dusuldugunde
 * istenen adet karsilaniyor mu? Karsilaniyorsa talebi gruba yazar.
 */
export function claimStock(
  claims: Map<string, number>,
  groupKey: string,
  stock: number,
  quantity: number
): boolean {
  const claimed = claims.get(groupKey) ?? 0;
  const remaining = Math.max(0, stock - claimed);
  if (remaining < quantity) return false;
  claims.set(groupKey, claimed + quantity);
  return true;
}

/**
 * Stok gruplama anahtari. Renk, SQL'deki `color = p_color` ile ayni sekilde
 * ham deger olarak kullanilir (normalize edilmez). Renk istenmemisse tum
 * satirlar ayni havuzu paylasir.
 */
export function stockGroupKey(
  materialId: string,
  requestedColor: string | null,
  hasColorRows: boolean
): string {
  return `${materialId}|${hasColorRows && requestedColor ? requestedColor : '*'}`;
}
