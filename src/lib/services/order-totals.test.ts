import { describe, expect, it } from 'vitest';
import {
  PRICE_DRIFT_TOLERANCE,
  calculateOrderTotals,
  hasPriceDrift,
  roundMoney,
} from './order-totals';

const settings = { vatRate: 0.2, shippingFee: 49.9, freeShippingMinAmount: 500 };

describe('roundMoney', () => {
  it('rounds to 2 decimals', () => {
    expect(roundMoney(10.006)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
    expect(roundMoney(1.2399999)).toBe(1.24);
  });
});

describe('calculateOrderTotals', () => {
  it('adds shipping below the free-shipping threshold', () => {
    const totals = calculateOrderTotals({ ...settings, itemsSubtotal: 100 });

    expect(totals.subtotal).toBe(100);
    expect(totals.shipping).toBe(49.9);
    expect(totals.vat).toBe(29.98); // (149.90) * 0.20
    expect(totals.total).toBe(179.88);
  });

  it('makes shipping free at the threshold', () => {
    const totals = calculateOrderTotals({ ...settings, itemsSubtotal: 500 });

    expect(totals.shipping).toBe(0);
    expect(totals.vat).toBe(100);
    expect(totals.total).toBe(600);
  });

  it('charges no shipping when the fee is zero', () => {
    const totals = calculateOrderTotals({
      itemsSubtotal: 10,
      vatRate: 0.2,
      shippingFee: 0,
      freeShippingMinAmount: 500,
    });

    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(12);
  });

  it('VAT is charged on shipping too', () => {
    const withShipping = calculateOrderTotals({ ...settings, itemsSubtotal: 0 });
    expect(withShipping.shipping).toBe(49.9);
    expect(withShipping.vat).toBe(9.98);
    expect(withShipping.total).toBe(59.88);
  });

  it('never returns negative amounts', () => {
    const totals = calculateOrderTotals({
      itemsSubtotal: -50,
      vatRate: 0.2,
      shippingFee: -10,
      freeShippingMinAmount: 0,
    });

    expect(totals).toEqual({ subtotal: 0, shipping: 0, vat: 0, total: 0 });
  });

  it('is consistent with bracket-style rounding (sum of rounded parts)', () => {
    const totals = calculateOrderTotals({ ...settings, itemsSubtotal: 123.456 });

    expect(totals.subtotal).toBe(123.46);
    expect(roundMoney(totals.subtotal + totals.shipping + totals.vat)).toBe(totals.total);
  });
});

describe('hasPriceDrift', () => {
  it('ignores a missing or non-numeric expectation', () => {
    expect(hasPriceDrift(undefined, 100)).toBe(false);
    expect(hasPriceDrift(Number.NaN, 100)).toBe(false);
  });

  it('tolerates the client display rounding noise', () => {
    expect(hasPriceDrift(100, 100)).toBe(false);
    expect(hasPriceDrift(100.01, 100)).toBe(false);
    expect(hasPriceDrift(100 + PRICE_DRIFT_TOLERANCE, 100)).toBe(false);
  });

  it('flags a real difference', () => {
    expect(hasPriceDrift(100.03, 100)).toBe(true);
    expect(hasPriceDrift(99, 100)).toBe(true);
  });
});
