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
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
}

/** Tolerance when comparing the amount the user saw with the server total. */
export const PRICE_DRIFT_TOLERANCE = 0.02;

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = roundMoney(Math.max(0, input.itemsSubtotal));

  // Free shipping applies from the configured threshold; a fee of 0 is free.
  const shipping =
    input.shippingFee > 0 && subtotal >= input.freeShippingMinAmount
      ? 0
      : roundMoney(Math.max(0, input.shippingFee));

  const vat = roundMoney((subtotal + shipping) * input.vatRate);
  const total = roundMoney(subtotal + shipping + vat);

  return { subtotal, shipping, vat, total };
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
