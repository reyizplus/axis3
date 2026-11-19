/**
 * Order totals math (pure).
 *
 * Extracted from `order-creation-service` so the money math can be tested
 * without a database. The server is the only place that prices an order; the
 * client only reports the total it displayed (`expectedTotal`) so a drift can
 * be detected.
 */

import { roundMoney } from '@/lib/utils/money';

export { roundMoney };

export interface OrderTotalsInput {
  /** Sum of the already-priced order items. */
  itemsSubtotal: number;
  /** 0..1, e.g. 0.20 for %20 VAT. */
  vatRate: number;
  /** Flat shipping fee. */
  shippingFee: number;
  /** Order subtotal at/above which shipping is free. */
  freeShippingMinAmount: number;
  /**
   * Coupon discount on top of the item prices (TL). Clamped to the subtotal so
   * a stale or tampered amount can never produce a negative order.
   */
  discountAmount?: number;
  /** Coupon grants free shipping regardless of the threshold. */
  freeShipping?: boolean;
}

export interface OrderTotals {
  subtotal: number;
  /** Applied coupon discount (0 when none). */
  discount: number;
  /** `subtotal - discount`; what the items cost after the coupon. */
  discountedSubtotal: number;
  shipping: number;
  vat: number;
  total: number;
}

/** Tolerance when comparing the amount the user saw with the server total. */
export const PRICE_DRIFT_TOLERANCE = 0.02;

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = roundMoney(Math.max(0, input.itemsSubtotal));

  // A coupon can never discount more than the items are worth.
  const discount = roundMoney(
    Math.min(Math.max(0, Number(input.discountAmount) || 0), subtotal)
  );
  const discountedSubtotal = roundMoney(subtotal - discount);

  // Free shipping applies from the configured threshold, when the coupon
  // grants it, or when there is no fee at all.
  //
  // Both the threshold and any coupon minimum are evaluated on the pre-discount
  // subtotal, so a coupon cannot push the cart below the free-shipping line.
  const shipping =
    input.freeShipping === true || input.shippingFee <= 0 || subtotal >= input.freeShippingMinAmount
      ? 0
      : roundMoney(input.shippingFee);

  // VAT is charged on the discounted goods plus shipping.
  const vat = roundMoney((discountedSubtotal + shipping) * input.vatRate);
  const total = roundMoney(discountedSubtotal + shipping + vat);

  return { subtotal, discount, discountedSubtotal, shipping, vat, total };
}

/**
 * True when the total the user saw differs from the server-computed total by
 * more than the rounding tolerance. Compared in whole kuruş so floating point
 * noise cannot flip the result.
 */
export function hasPriceDrift(expectedTotal: number | undefined, serverTotal: number): boolean {
  if (typeof expectedTotal !== 'number' || !Number.isFinite(expectedTotal)) return false;

  const expectedCents = Math.round(expectedTotal * 100);
  const serverCents = Math.round(serverTotal * 100);
  const toleranceCents = Math.round(PRICE_DRIFT_TOLERANCE * 100);

  return Math.abs(expectedCents - serverCents) > toleranceCents;
}

/**
 * `409 price_changed` yanıtıyla istemciye dönen veri.
 *
 * Amaç: müşteri "fiyatlar güncellendi" hatasında kilitli kalmasın. Sunucunun
 * hesapladığı kalem fiyatları ve toplam istemciye gider; istemci sepetini bu
 * tutarlarla günceller ve müşteri yeni tutarı görüp siparişi tekrar onaylar.
 * Bu tutarlar yalnızca **gösterim** içindir: sipariş yine sunucunun kendi
 * hesabıyla oluşturulur, istemciden gelen tutar fiyatlandırmada kullanılmaz.
 */
export interface PriceChangeDetails {
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    vat: number;
    total: number;
  };
  /** İstekteki `items` dizisiyle aynı sırada. */
  items: {
    index: number;
    unitPrice: number;
    totalPrice: number;
    supportEnabled: boolean;
    printSettingId: string | null;
    isPreorder: boolean;
    preorderDiscountPercent: number | null;
    estimatedRestockDays: number | null;
    /**
     * Adet indirimi (TL) ve yüzdesi. Sepet bu değerleri gösterir: fiyatın
     * neden düştüğünü müşteri görebilmeli. Sipariş fiyatlandırmasında
     * kullanılmaz; `totalPrice` zaten indirim uygulanmış tutardır.
     */
    quantityDiscount: number | null;
    quantityDiscountPercent: number | null;
  }[];
  /** İstekteki `storeItems` dizisiyle aynı sırada. */
  storeItems: {
    index: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}
