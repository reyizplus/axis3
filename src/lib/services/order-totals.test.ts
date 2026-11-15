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

    expect(totals).toEqual({
      subtotal: 0,
      discount: 0,
      discountedSubtotal: 0,
      shipping: 0,
      vat: 0,
      total: 0,
    });
  });

  it('is consistent with bracket-style rounding (sum of rounded parts)', () => {
    const totals = calculateOrderTotals({ ...settings, itemsSubtotal: 123.456 });

    expect(totals.subtotal).toBe(123.46);
    expect(roundMoney(totals.subtotal + totals.shipping + totals.vat)).toBe(totals.total);
  });
});

describe('calculateOrderTotals with a coupon', () => {
  it('reports no discount when the coupon amount is missing', () => {
    const totals = calculateOrderTotals({ ...settings, itemsSubtotal: 100 });

    expect(totals.discount).toBe(0);
    expect(totals.discountedSubtotal).toBe(100);
  });

  it('subtracts the discount before VAT is calculated', () => {
    const totals = calculateOrderTotals({
      ...settings,
      itemsSubtotal: 100,
      discountAmount: 10,
    });

    expect(totals.subtotal).toBe(100);
    expect(totals.discount).toBe(10);
    expect(totals.discountedSubtotal).toBe(90);
    expect(totals.shipping).toBe(49.9);
    expect(totals.vat).toBe(27.98); // (90 + 49.90) * 0.20
    expect(totals.total).toBe(167.88);
  });

  it('keeps the free-shipping threshold on the pre-discount subtotal', () => {
    const totals = calculateOrderTotals({
      ...settings,
      itemsSubtotal: 500,
      discountAmount: 400,
    });

    expect(totals.shipping).toBe(0);
    expect(totals.discountedSubtotal).toBe(100);
    expect(totals.vat).toBe(20);
    expect(totals.total).toBe(120);
  });

  it('grants free shipping when the coupon says so', () => {
    const totals = calculateOrderTotals({
      ...settings,
      itemsSubtotal: 100,
      freeShipping: true,
    });

    expect(totals.shipping).toBe(0);
    expect(totals.vat).toBe(20);
    expect(totals.total).toBe(120);
  });

  it('clamps the discount to the subtotal', () => {
    const totals = calculateOrderTotals({
      ...settings,
      itemsSubtotal: 30,
      discountAmount: 100,
    });

    expect(totals.discount).toBe(30);
    expect(totals.discountedSubtotal).toBe(0);
    expect(totals.vat).toBe(9.98); // only shipping is taxed
    expect(totals.total).toBe(59.88);
  });

  it('ignores a negative or non-numeric discount', () => {
    const negative = calculateOrderTotals({
      ...settings,
      itemsSubtotal: 100,
      discountAmount: -20,
    });
    const invalid = calculateOrderTotals({
      ...settings,
      itemsSubtotal: 100,
      discountAmount: Number.NaN,
    });

    expect(negative.discount).toBe(0);
    expect(invalid.discount).toBe(0);
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
