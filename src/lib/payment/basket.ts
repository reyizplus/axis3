/**
 * iyzico basket construction (pure).
 *
 * iyzico rejects a payment when the sum of `basketItems` does not equal
 * `paidPrice`. Our order total is:
 *
 *   (items − coupon) + shipping + VAT
 *
 * With a coupon, sending the undiscounted item prices already breaks that
 * identity, so the discount is distributed across the goods proportionally
 * (largest-remainder in kuruş) and the basket total is corrected once at the
 * end. Free-shipping coupons need no special handling: their shipping cost is
 * already 0 on the order.
 */

export interface BasketLine {
  id: string;
  name: string;
  category1: string;
  category2: string;
  /** iyzico item type (the SDK types it as a string enum). */
  itemType: number | string;
  priceCents: number;
}

export interface BuildBasketInput {
  /** Physical goods: 3D print lines and store products. */
  goods: BasketLine[];
  shippingCents?: number;
  taxCents?: number;
  /** Coupon discount, already clamped to the goods subtotal by order totals. */
  discountCents?: number;
  /** What the customer actually pays (`orders.total_amount`). */
  paidCents: number;
  /** Item type for the generated shipping/tax rows. */
  feeItemType?: number | string;
}

function normalizeCents(value: number | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

/**
 * Splits `discountCents` across `prices` in proportion to their size and
 * returns the discounted prices. The result always sums to
 * `total − discount` exactly, and no line goes below zero.
 */
export function distributeDiscountCents(prices: number[], discountCents: number): number[] {
  const normalized = prices.map(normalizeCents);
  const total = normalized.reduce((sum, price) => sum + price, 0);

  if (total === 0) return normalized.map(() => 0);

  const discount = Math.min(normalizeCents(discountCents), total);
  const target = total - discount;

  // Floor first, then hand the remaining kuruş out in order. Flooring never
  // overshoots the target, so the remainder is always >= 0.
  const allocated = normalized.map((price) => Math.floor((price * target) / total));
  let remainder = target - allocated.reduce((sum, price) => sum + price, 0);

  for (let i = 0; i < allocated.length && remainder > 0; i += 1) {
    const room = normalized[i] - allocated[i];
    const add = Math.min(room, remainder);
    allocated[i] += add;
    remainder -= add;
  }

  return allocated;
}

/**
 * Builds the final basket. Zero-priced lines are dropped (iyzico rejects
 * them), then any residual difference between the basket and `paidCents` is
 * absorbed by the largest line; if that line cannot absorb it, it is removed
 * and the next largest takes over.
 */
export function buildBasketItems(input: BuildBasketInput): BasketLine[] {
  const discount = normalizeCents(input.discountCents ?? 0);
  const allocated = distributeDiscountCents(
    input.goods.map((line) => line.priceCents),
    discount
  );

  const lines: BasketLine[] = input.goods
    .map((line, index) => ({ ...line, priceCents: allocated[index] }))
    .filter((line) => line.priceCents > 0);

  const feeItemType = input.feeItemType ?? 1;
  const shipping = normalizeCents(input.shippingCents ?? 0);
  if (shipping > 0) {
    lines.push({
      id: 'shipping',
      name: 'Kargo Ücreti',
      category1: 'Kargo',
      category2: 'Teslimat',
      itemType: feeItemType,
      priceCents: shipping,
    });
  }

  const tax = normalizeCents(input.taxCents ?? 0);
  if (tax > 0) {
    lines.push({
      id: 'tax',
      name: 'KDV',
      category1: 'Vergi',
      category2: 'KDV',
      itemType: feeItemType,
      priceCents: tax,
    });
  }

  let diff =
    normalizeCents(input.paidCents) - lines.reduce((sum, line) => sum + line.priceCents, 0);
  let guard = lines.length * 2;

  while (diff !== 0 && lines.length > 0 && guard > 0) {
    guard -= 1;

    let index = 0;
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].priceCents > lines[index].priceCents) index = i;
    }

    const corrected = lines[index].priceCents + diff;
    if (corrected > 0) {
      lines[index] = { ...lines[index], priceCents: corrected };
      diff = 0;
    } else {
      // Drop the line; the remaining gap is what is left to reconcile.
      diff = corrected;
      lines.splice(index, 1);
    }
  }

  return lines;
}
