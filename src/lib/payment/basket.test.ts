import { describe, expect, it } from 'vitest';
import {
  buildBasketItems,
  distributeDiscountCents,
  type BasketLine,
} from './basket';

function line(id: string, priceCents: number): BasketLine {
  return {
    id,
    name: id,
    category1: '3D Baskı',
    category2: 'PLA',
    itemType: 1,
    priceCents,
  };
}

const sum = (lines: BasketLine[]) => lines.reduce((total, item) => total + item.priceCents, 0);

describe('distributeDiscountCents', () => {
  it('returns the prices unchanged without a discount', () => {
    expect(distributeDiscountCents([1000, 2500, 500], 0)).toEqual([1000, 2500, 500]);
  });

  it('splits a discount proportionally', () => {
    // 10% off: 1000 -> 900, 2500 -> 2250, 500 -> 450
    expect(distributeDiscountCents([1000, 2500, 500], 400)).toEqual([900, 2250, 450]);
  });

  it('never loses a kuruş to rounding', () => {
    const prices = [333, 333, 334];
    const discounted = distributeDiscountCents(prices, 100);

    expect(discounted.reduce((a, b) => a + b, 0)).toBe(900);
    expect(discounted.every((price) => price >= 0)).toBe(true);
  });

  it('clamps the discount to the total', () => {
    expect(distributeDiscountCents([1000, 500], 99_999)).toEqual([0, 0]);
  });

  it('ignores negative and non-numeric prices', () => {
    expect(distributeDiscountCents([-100, Number.NaN, 200], 100)).toEqual([0, 0, 100]);
  });

  it('returns zeros for an empty or zero basket', () => {
    expect(distributeDiscountCents([], 100)).toEqual([]);
    expect(distributeDiscountCents([0, 0], 100)).toEqual([0, 0]);
  });
});

describe('buildBasketItems', () => {
  it('sends the undiscounted goods plus shipping and tax', () => {
    const basket = buildBasketItems({
      goods: [line('a', 10_000), line('b', 2_500)],
      shippingCents: 4_990,
      taxCents: 3_498,
      paidCents: 20_988,
    });

    expect(basket.map((item) => item.id)).toEqual(['a', 'b', 'shipping', 'tax']);
    expect(sum(basket)).toBe(20_988);
  });

  it('keeps the basket total equal to the discounted paid price', () => {
    const basket = buildBasketItems({
      goods: [line('a', 10_000), line('b', 25_000)],
      shippingCents: 4_990,
      taxCents: 7_998,
      discountCents: 3_500,
      paidCents: 44_488, // 35.000 + 4.990 + 7.998 - 3.500
    });

    expect(sum(basket)).toBe(44_488);
    expect(basket.find((item) => item.id === 'a')?.priceCents).toBe(9_000);
    expect(basket.find((item) => item.id === 'b')?.priceCents).toBe(22_500);
  });

  it('drops goods lines that the coupon reduces to zero', () => {
    const basket = buildBasketItems({
      goods: [line('a', 2_000), line('b', 500)],
      discountCents: 2_500,
      paidCents: 0,
    });

    expect(basket).toEqual([]);
  });

  it('omits shipping when the coupon grants free shipping', () => {
    const basket = buildBasketItems({
      goods: [line('a', 10_000)],
      shippingCents: 0,
      taxCents: 2_000,
      discountCents: 1_000,
      paidCents: 11_000,
    });

    expect(basket.map((item) => item.id)).toEqual(['a', 'tax']);
    expect(sum(basket)).toBe(11_000);
  });

  it('corrects a residual difference on the largest line', () => {
    const basket = buildBasketItems({
      goods: [line('a', 10_000), line('b', 5_000)],
      paidCents: 15_001,
    });

    expect(sum(basket)).toBe(15_001);
    expect(basket[0].priceCents).toBe(10_001);
  });

  it('removes a line that cannot absorb a negative difference', () => {
    const basket = buildBasketItems({
      goods: [line('a', 100), line('b', 200)],
      paidCents: 50,
    });

    expect(basket.map((item) => item.id)).toEqual(['a']);
    expect(sum(basket)).toBe(50);
    expect(basket.every((item) => item.priceCents > 0)).toBe(true);
  });

  it('returns an empty basket when there is nothing to charge', () => {
    expect(buildBasketItems({ goods: [], paidCents: 0 })).toEqual([]);
  });
});
