/**
 * Applied-coupon state shared by the cart and checkout pages.
 *
 * The code lives in `localStorage` so a coupon applied in the cart survives
 * the navigation to checkout, and every write dispatches `coupon-updated` so
 * both pages (and other tabs, via the native `storage` event) stay in sync.
 *
 * The stored amount is only a preview: `POST /api/v1/coupons/validate` is the
 * server's answer, and order creation recomputes everything again.
 */

export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | string;

export interface AppliedCoupon {
  code: string;
  discountType: CouponDiscountType;
  /** TL already rounded by the server. 0 for a free-shipping coupon. */
  discountAmount: number;
  freeShipping: boolean;
  description: string | null;
}

export interface CouponCartTotals {
  /** 3D baskı + mağaza, item-level discounts included. */
  itemsSubtotal: number;
  serviceSubtotal: number;
  storeSubtotal: number;
}

export type CouponValidationResult =
  | { valid: true; coupon: AppliedCoupon }
  | { valid: false; error: string; reason?: string };

export const COUPON_UPDATED_EVENT = 'coupon-updated';
export const COUPON_STORAGE_PREFIX = 'axis3_coupon_';

/** Mirrors `coupon-service.normalizeCouponCode`, kept client-safe. */
export function normalizeCouponCode(code: string | null | undefined): string {
  return String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function getStorageKey(): string {
  if (typeof window === 'undefined') return `${COUPON_STORAGE_PREFIX}anonymous`;

  try {
    const userId = localStorage.getItem('axis3_cart_user');
    return `${COUPON_STORAGE_PREFIX}${userId || 'anonymous'}`;
  } catch {
    return `${COUPON_STORAGE_PREFIX}anonymous`;
  }
}

function isAppliedCoupon(value: unknown): value is AppliedCoupon {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppliedCoupon>;
  return typeof candidate.code === 'string' && candidate.code.length > 0;
}

export function getAppliedCoupon(): AppliedCoupon | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAppliedCoupon(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function dispatchCouponUpdated(coupon: AppliedCoupon | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AppliedCoupon | null>(COUPON_UPDATED_EVENT, { detail: coupon }));
}

export function setAppliedCoupon(coupon: AppliedCoupon | null): void {
  if (typeof window === 'undefined') return;

  try {
    if (coupon) localStorage.setItem(getStorageKey(), JSON.stringify(coupon));
    else localStorage.removeItem(getStorageKey());
  } catch {
    // Storage can be disabled (private mode); the in-memory hook state still works.
  }

  dispatchCouponUpdated(coupon);
}

export function clearAppliedCoupon(): void {
  setAppliedCoupon(null);
}

/**
 * Asks the server whether the code still applies to this cart. Never throws:
 * the coupon UI turns every failure into a single-line message.
 */
export async function validateCouponCode(
  code: string,
  totals: CouponCartTotals
): Promise<CouponValidationResult> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return { valid: false, error: 'Kupon kodu girin' };

  try {
    const response = await fetch('/api/v1/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: normalized,
        itemsSubtotal: totals.itemsSubtotal,
        serviceSubtotal: totals.serviceSubtotal,
        storeSubtotal: totals.storeSubtotal,
      }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.valid === true) {
      return {
        valid: true,
        coupon: {
          code: typeof data.code === 'string' ? data.code : normalized,
          discountType: data.discountType ?? 'percentage',
          discountAmount: Math.max(0, Number(data.discountAmount) || 0),
          freeShipping: data.freeShipping === true,
          description: typeof data.description === 'string' ? data.description : null,
        },
      };
    }

    return {
      valid: false,
      error:
        (typeof data?.error === 'string' && data.error) ||
        'Kupon doğrulanamadı. Lütfen tekrar deneyin.',
      reason: typeof data?.reason === 'string' ? data.reason : undefined,
    };
  } catch {
    return { valid: false, error: 'Kupon doğrulanamadı. Lütfen tekrar deneyin.' };
  }
}
