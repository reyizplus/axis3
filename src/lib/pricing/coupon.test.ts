import { describe, expect, it } from 'vitest';
import {
  COUPON_ERROR_MESSAGES,
  calculateCouponDiscount,
  evaluateCoupon,
  getCouponDiscountBase,
  type CouponEvaluationInput,
  type CouponRules,
} from './coupon';

const NOW = new Date('2026-06-15T12:00:00.000Z');

function baseRules(overrides: Partial<CouponRules> = {}): CouponRules {
  return {
    discountType: 'percentage',
    discountValue: 10,
    isActive: true,
    appliesTo: 'all',
    quotaBasis: 'distinct_users',
    perUserMode: 'single',
    ...overrides,
  };
}

function baseInput(overrides: Partial<CouponEvaluationInput> = {}): CouponEvaluationInput {
  return {
    rules: baseRules(),
    itemsSubtotal: 250,
    serviceSubtotal: 200,
    storeSubtotal: 50,
    userId: 'user-1',
    now: NOW,
    ...overrides,
  };
}

/** Valid coupon shortcut: keeps each test focused on the rule under test. */
function expectValid(input: CouponEvaluationInput) {
  const result = evaluateCoupon(input);
  if (!result.valid) {
    throw new Error(`expected valid coupon, got ${result.reason}`);
  }
  return result;
}

function expectRejected(input: CouponEvaluationInput, reason: string) {
  const result = evaluateCoupon(input);
  expect(result.valid).toBe(false);
  if (result.valid) return;
  expect(result.reason).toBe(reason);
  expect(result.message).toBe(COUPON_ERROR_MESSAGES[result.reason]);
}

describe('getCouponDiscountBase', () => {
  const subtotals = { itemsSubtotal: 300, serviceSubtotal: 200, storeSubtotal: 100 };

  it('uses the whole cart for appliesTo=all', () => {
    expect(getCouponDiscountBase({ appliesTo: 'all' }, subtotals)).toBe(300);
    expect(getCouponDiscountBase({}, subtotals)).toBe(300);
  });

  it('uses only the 3D printing subtotal for appliesTo=service', () => {
    expect(getCouponDiscountBase({ appliesTo: 'service' }, subtotals)).toBe(200);
  });

  it('uses only the store subtotal for appliesTo=store', () => {
    expect(getCouponDiscountBase({ appliesTo: 'store' }, subtotals)).toBe(100);
  });

  it('treats missing and negative amounts as zero', () => {
    expect(
      getCouponDiscountBase({ appliesTo: 'service' }, {
        itemsSubtotal: 0,
        serviceSubtotal: -5,
        storeSubtotal: 0,
      })
    ).toBe(0);
  });
});

describe('calculateCouponDiscount', () => {
  it('applies a percentage of the base', () => {
    expect(
      calculateCouponDiscount({ discountType: 'percentage', discountValue: 10 }, 250)
    ).toBe(25);
  });

  it('rounds the percentage discount to kuruş', () => {
    expect(
      calculateCouponDiscount({ discountType: 'percentage', discountValue: 33.33 }, 100)
    ).toBe(33.33);
  });

  it('caps a percentage discount at maxDiscountAmount', () => {
    expect(
      calculateCouponDiscount(
        { discountType: 'percentage', discountValue: 50, maxDiscountAmount: 20 },
        250
      )
    ).toBe(20);
  });

  it('ignores a non-positive cap', () => {
    expect(
      calculateCouponDiscount(
        { discountType: 'percentage', discountValue: 10, maxDiscountAmount: 0 },
        250
      )
    ).toBe(25);
  });

  it('never exceeds 100% of the base', () => {
    expect(
      calculateCouponDiscount({ discountType: 'percentage', discountValue: 150 }, 80)
    ).toBe(80);
  });

  it('clamps a fixed amount to the base', () => {
    expect(
      calculateCouponDiscount({ discountType: 'fixed_amount', discountValue: 50 }, 30)
    ).toBe(30);
    expect(
      calculateCouponDiscount({ discountType: 'fixed_amount', discountValue: 50 }, 120)
    ).toBe(50);
  });

  it('returns 0 for free-shipping coupons and for zero bases', () => {
    expect(
      calculateCouponDiscount({ discountType: 'free_shipping', discountValue: 0 }, 250)
    ).toBe(0);
    expect(
      calculateCouponDiscount({ discountType: 'percentage', discountValue: 10 }, 0)
    ).toBe(0);
  });

  it('returns 0 when the configured value is not a discount', () => {
    expect(
      calculateCouponDiscount({ discountType: 'percentage', discountValue: 0 }, 250)
    ).toBe(0);
    expect(
      calculateCouponDiscount({ discountType: 'fixed_amount', discountValue: -10 }, 250)
    ).toBe(0);
  });
});

describe('evaluateCoupon', () => {
  it('accepts a valid percentage coupon', () => {
    const result = expectValid(baseInput());

    expect(result.discountBase).toBe(250);
    expect(result.discountAmount).toBe(25);
    expect(result.freeShipping).toBe(false);
  });

  it('accepts a fixed-amount coupon', () => {
    const result = expectValid(
      baseInput({
        rules: baseRules({ discountType: 'fixed_amount', discountValue: 75 }),
      })
    );

    expect(result.discountAmount).toBe(75);
  });

  it('accepts a free-shipping coupon without a cart discount', () => {
    const result = expectValid(
      baseInput({ rules: baseRules({ discountType: 'free_shipping', discountValue: 0 }) })
    );

    expect(result.discountAmount).toBe(0);
    expect(result.freeShipping).toBe(true);
  });

  it('applies the discount to the scoped subtotal only', () => {
    const result = expectValid(
      baseInput({ rules: baseRules({ appliesTo: 'store' }) })
    );

    expect(result.discountBase).toBe(50);
    expect(result.discountAmount).toBe(5);
  });

  it('hides a coupon owned by another user behind not_found', () => {
    expectRejected(
      baseInput({ rules: baseRules({ ownerUserId: 'someone-else' }) }),
      'not_found'
    );
  });

  it('accepts a coupon owned by the current user', () => {
    const result = expectValid(
      baseInput({ rules: baseRules({ ownerUserId: 'user-1' }) })
    );

    expect(result.discountAmount).toBe(25);
  });

  it('rejects an inactive coupon', () => {
    expectRejected(baseInput({ rules: baseRules({ isActive: false }) }), 'inactive');
  });

  it('rejects a coupon whose quota was closed', () => {
    expectRejected(
      baseInput({ rules: baseRules({ exhaustedAt: '2026-06-01T00:00:00.000Z' }) }),
      'quota_exhausted'
    );
  });

  it('rejects a coupon that has not started yet', () => {
    expectRejected(
      baseInput({
        rules: baseRules({ startsAt: '2026-07-01T00:00:00.000Z' }),
      }),
      'not_started'
    );
  });

  it('rejects an expired coupon', () => {
    expectRejected(
      baseInput({ rules: baseRules({ endsAt: '2026-06-01T00:00:00.000Z' }) }),
      'expired'
    );
  });

  it('accepts a coupon inside its validity window', () => {
    const result = expectValid(
      baseInput({
        rules: baseRules({
          startsAt: '2026-06-01T00:00:00.000Z',
          endsAt: '2026-07-01T00:00:00.000Z',
        }),
      })
    );

    expect(result.discountAmount).toBe(25);
  });

  it('rejects an empty cart', () => {
    expectRejected(
      baseInput({ itemsSubtotal: 0, serviceSubtotal: 0, storeSubtotal: 0 }),
      'empty_cart'
    );
  });

  it('rejects a store-only coupon when the cart has no store items', () => {
    expectRejected(
      baseInput({
        rules: baseRules({ appliesTo: 'store' }),
        storeSubtotal: 0,
        serviceSubtotal: 250,
      }),
      'not_applicable'
    );
  });

  it('checks the minimum order amount against the pre-discount subtotal', () => {
    expectRejected(
      baseInput({ rules: baseRules({ minOrderAmount: 300 }) }),
      'min_order'
    );

    const atThreshold = expectValid(
      baseInput({ itemsSubtotal: 300, serviceSubtotal: 300, storeSubtotal: 0, rules: baseRules({ minOrderAmount: 300 }) })
    );
    expect(atThreshold.discountAmount).toBe(30);
  });

  it('rejects a repeat order when the coupon is first-order only', () => {
    expectRejected(
      baseInput({ rules: baseRules({ firstOrderOnly: true }), previousOrderCount: 2 }),
      'first_order_only'
    );

    const firstOrder = expectValid(
      baseInput({ rules: baseRules({ firstOrderOnly: true }), previousOrderCount: 0 })
    );
    expect(firstOrder.discountAmount).toBe(25);
  });

  it('counts the quota by distinct users by default', () => {
    expectRejected(
      baseInput({
        rules: baseRules({ quotaLimit: 10 }),
        campaignUserCount: 10,
        campaignRedemptionCount: 3,
      }),
      'quota_exhausted'
    );

    const underQuota = expectValid(
      baseInput({
        rules: baseRules({ quotaLimit: 10 }),
        campaignUserCount: 9,
        campaignRedemptionCount: 30,
      })
    );
    expect(underQuota.discountAmount).toBe(25);
  });

  it('counts the quota by redemptions when configured', () => {
    expectRejected(
      baseInput({
        rules: baseRules({ quotaLimit: 10, quotaBasis: 'redemptions' }),
        campaignUserCount: 2,
        campaignRedemptionCount: 10,
      }),
      'quota_exhausted'
    );

    const underQuota = expectValid(
      baseInput({
        rules: baseRules({ quotaLimit: 10, quotaBasis: 'redemptions' }),
        campaignUserCount: 8,
        campaignRedemptionCount: 9,
      })
    );
    expect(underQuota.discountAmount).toBe(25);
  });

  it('treats a missing quota limit as unlimited', () => {
    const result = expectValid(
      baseInput({ rules: baseRules({ quotaLimit: null }), campaignUserCount: 5000 })
    );

    expect(result.discountAmount).toBe(25);
  });

  it('rejects a user who already used a single-use coupon', () => {
    expectRejected(
      baseInput({ rules: baseRules({ perUserMode: 'single' }), userRedemptionCount: 1 }),
      'user_limit'
    );
  });

  it('honours the per-user limit in limited mode', () => {
    const rules = baseRules({ perUserMode: 'limited', perUserLimit: 3 });

    expectRejected(baseInput({ rules, userRedemptionCount: 3 }), 'user_limit');

    const secondUse = expectValid(baseInput({ rules, userRedemptionCount: 2 }));
    expect(secondUse.discountAmount).toBe(25);
  });

  it('allows repeat use when perUserMode is unlimited', () => {
    const result = expectValid(
      baseInput({ rules: baseRules({ perUserMode: 'unlimited' }), userRedemptionCount: 42 })
    );

    expect(result.discountAmount).toBe(25);
  });

  it('rejects a coupon that produces no discount', () => {
    expectRejected(
      baseInput({ rules: baseRules({ discountValue: 0 }) }),
      'invalid_value'
    );
  });

  it('reports the expiry before amount conditions', () => {
    expectRejected(
      baseInput({
        rules: baseRules({ endsAt: '2026-06-01T00:00:00.000Z', minOrderAmount: 100000 }),
        itemsSubtotal: 10,
      }),
      'expired'
    );
  });

  it('has a message for every rejection reason', () => {
    const reasons = [
      'not_found',
      'inactive',
      'not_started',
      'expired',
      'empty_cart',
      'not_applicable',
      'min_order',
      'first_order_only',
      'quota_exhausted',
      'user_limit',
      'invalid_value',
    ] as const;

    for (const reason of reasons) {
      expect(COUPON_ERROR_MESSAGES[reason]).toBeTruthy();
    }
  });
});
