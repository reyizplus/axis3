/**
 * Coupon service (server-only).
 *
 * Owns every database interaction for the coupon feature:
 * - resolving a code and its campaign-level usage counters
 * - running the shared pure rule engine (`@/lib/pricing/coupon`)
 * - reserving / consuming / releasing a redemption through the RPCs from
 *   `supabase/migrations/100_coupon_system.sql`
 *
 * The server is the only price authority: the cart/checkout preview never
 * decides the amount, it only shows what this module returns for the cart it
 * just described. Order creation recomputes everything again.
 */

import {
  COUPON_ERROR_MESSAGES,
  evaluateCoupon,
  type CouponEvaluation,
  type CouponRejectionReason,
  type CouponRules,
} from '@/lib/pricing/coupon';
import { isMissingRelationError, isMissingFunctionError } from '@/lib/supabase/errors';
import { createServiceClient } from '@/lib/supabase/server';

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * The generated `Database` type predates migration 100, so the coupon tables
 * and views are not in it yet. Keep the untyped access in one place.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function couponDb(supabase: ServiceClient): any {
  return supabase;
}

/** Codes are printed, so keep them short, upper-case and easy to retype. */
export const COUPON_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{5,39}$/;
export const COUPON_CODE_MIN_LENGTH = 6;
export const COUPON_CODE_MAX_LENGTH = 40;

export const COUPON_UNAVAILABLE_MESSAGE =
  'Kupon sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  applies_to: string;
  starts_at: string | null;
  ends_at: string | null;
  quota_basis: string | null;
  quota_limit: number | null;
  per_user_mode: string | null;
  per_user_limit: number | null;
  first_order_only: boolean;
  is_active: boolean;
  is_personal: boolean;
  owner_user_id: string | null;
  batch_id: string | null;
  exhausted_at: string | null;
}

export function normalizeCouponCode(code: string | null | undefined): string {
  return String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function isValidCouponCodeFormat(code: string): boolean {
  return COUPON_CODE_PATTERN.test(normalizeCouponCode(code));
}

export function getCouponCampaignKey(coupon: Pick<CouponRow, 'id' | 'batch_id'>): string {
  return coupon.batch_id || coupon.id;
}

/**
 * DB row → the shape the shared rule engine expects. Unknown/missing values
 * fall back to the safest setting instead of granting an unintended discount.
 */
export function toCouponRules(coupon: CouponRow): CouponRules {
  return {
    discountType:
      coupon.discount_type === 'fixed_amount' || coupon.discount_type === 'free_shipping'
        ? coupon.discount_type
        : 'percentage',
    discountValue: Number(coupon.discount_value) || 0,
    maxDiscountAmount: coupon.max_discount_amount,
    minOrderAmount: coupon.min_order_amount,
    appliesTo:
      coupon.applies_to === 'service' || coupon.applies_to === 'store'
        ? coupon.applies_to
        : 'all',
    quotaBasis: coupon.quota_basis === 'redemptions' ? 'redemptions' : 'distinct_users',
    quotaLimit: coupon.quota_limit,
    perUserMode:
      coupon.per_user_mode === 'unlimited' || coupon.per_user_mode === 'limited'
        ? coupon.per_user_mode
        : 'single',
    perUserLimit: coupon.per_user_limit,
    firstOrderOnly: coupon.first_order_only === true,
    startsAt: coupon.starts_at,
    endsAt: coupon.ends_at,
    isActive: coupon.is_active !== false,
    ownerUserId: coupon.owner_user_id,
    exhaustedAt: coupon.exhausted_at,
  };
}

/** PostgREST `ilike` treats `%`/`_` as wildcards; codes must match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export interface CouponLookupResult {
  /** False when the coupon tables are missing (migration not applied yet). */
  available: boolean;
  coupon: CouponRow | null;
}

export async function findCouponByCode(
  supabase: ServiceClient,
  code: string
): Promise<CouponLookupResult> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return { available: true, coupon: null };

  const { data, error } = await (couponDb(supabase).from('coupons') as any)
    .select('*')
    .ilike('code', escapeLike(normalized))
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error, 'coupons')) {
      return { available: false, coupon: null };
    }
    console.error('[Coupons] Code lookup failed:', error);
    throw new Error('Kupon sorgulanamadı');
  }

  return { available: true, coupon: (data as CouponRow) ?? null };
}

export interface CampaignUsage {
  users: number;
  redemptions: number;
}

/** Derived counters; the view ignores released/expired reservations. */
export async function getCampaignUsage(
  supabase: ServiceClient,
  campaignKey: string
): Promise<CampaignUsage> {
  const { data } = await (couponDb(supabase).from('coupon_usage') as any)
    .select('user_count, redemption_count')
    .eq('campaign_key', campaignKey)
    .maybeSingle();

  return {
    users: Math.max(0, Number(data?.user_count) || 0),
    redemptions: Math.max(0, Number(data?.redemption_count) || 0),
  };
}

export async function getUserCampaignUsage(
  supabase: ServiceClient,
  campaignKey: string,
  userId: string
): Promise<number> {
  const { data } = await (couponDb(supabase).from('coupon_user_usage') as any)
    .select('redemption_count')
    .eq('campaign_key', campaignKey)
    .eq('user_id', userId)
    .maybeSingle();

  return Math.max(0, Number(data?.redemption_count) || 0);
}

export async function getPreviousOrderCount(
  supabase: ServiceClient,
  userId: string
): Promise<number> {
  const { count } = await (supabase.from('orders') as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'cancelled');

  return Math.max(0, Number(count) || 0);
}

/** Emergency switch from `global_settings`; missing row/key means enabled. */
export async function isCouponSystemEnabled(supabase: ServiceClient): Promise<boolean> {
  const { data, error } = await (supabase.from('global_settings') as any)
    .select('value')
    .eq('key', 'coupons_enabled')
    .maybeSingle();

  if (error) return true;
  // `global_settings.value` is normally `{ "value": false }`, but the seed in
  // migration 100 stores the bare boolean. Accept both shapes so the emergency
  // switch works no matter which one is in the table.
  const raw = data?.value as unknown;
  const value =
    raw && typeof raw === 'object' && 'value' in raw
      ? (raw as { value?: unknown }).value
      : raw;
  return value !== false;
}

export type ValidCouponEvaluation = Extract<CouponEvaluation, { valid: true }>;
export type InvalidCouponEvaluation = Extract<CouponEvaluation, { valid: false }>;

export type CouponCheck =
  | {
      available: true;
      ok: true;
      coupon: CouponRow;
      rules: CouponRules;
      evaluation: ValidCouponEvaluation;
    }
  | {
      available: true;
      ok: false;
      coupon: CouponRow | null;
      evaluation: InvalidCouponEvaluation;
    }
  | {
      available: false;
      ok: false;
      coupon: null;
      evaluation: { valid: false; reason: 'not_found'; message: string };
    };

export interface CouponCheckInput {
  code: string;
  userId: string;
  itemsSubtotal: number;
  serviceSubtotal: number;
  storeSubtotal: number;
  now?: Date;
}

/**
 * Looks the code up, loads the live usage counters and runs the shared rules.
 * Used by both the preview endpoint and order creation, so the customer sees
 * exactly the amount the server will charge.
 */
export async function checkCoupon(
  supabase: ServiceClient,
  input: CouponCheckInput
): Promise<CouponCheck> {
  const lookup = await findCouponByCode(supabase, input.code);
  if (!lookup.available) {
    return {
      available: false,
      ok: false,
      coupon: null,
      evaluation: {
        valid: false,
        reason: 'not_found',
        message: COUPON_UNAVAILABLE_MESSAGE,
      },
    };
  }

  if (!lookup.coupon) {
    return {
      available: true,
      ok: false,
      coupon: null,
      evaluation: {
        valid: false,
        reason: 'not_found',
        message: COUPON_ERROR_MESSAGES.not_found,
      },
    };
  }

  const coupon = lookup.coupon;
  const rules = toCouponRules(coupon);
  const campaignKey = getCouponCampaignKey(coupon);

  const [usage, userUsage, previousOrderCount] = await Promise.all([
    getCampaignUsage(supabase, campaignKey),
    getUserCampaignUsage(supabase, campaignKey, input.userId),
    rules.firstOrderOnly
      ? getPreviousOrderCount(supabase, input.userId)
      : Promise.resolve(0),
  ]);

  const evaluation = evaluateCoupon({
    rules,
    itemsSubtotal: input.itemsSubtotal,
    serviceSubtotal: input.serviceSubtotal,
    storeSubtotal: input.storeSubtotal,
    userId: input.userId,
    previousOrderCount,
    userRedemptionCount: userUsage,
    campaignUserCount: usage.users,
    campaignRedemptionCount: usage.redemptions,
    now: input.now,
  });

  if (evaluation.valid) {
    return { available: true, ok: true, coupon, rules, evaluation };
  }
  return { available: true, ok: false, coupon, evaluation };
}

/** HTTP status for the preview endpoint and order creation errors. */
export function couponFailureStatus(reason: CouponRejectionReason): number {
  switch (reason) {
    case 'not_found':
      return 404;
    case 'quota_exhausted':
    case 'user_limit':
    case 'first_order_only':
      return 409;
    case 'empty_cart':
      return 400;
    default:
      return 422;
  }
}

export interface CouponReservation {
  ok: boolean;
  reason?: CouponRejectionReason;
  message?: string;
  status: number;
  redemptionId?: string;
  discountAmount?: number;
}

/**
 * Reserves a slot for the order. The RPC re-checks the live rules and takes a
 * campaign advisory lock, so a quota filled by a concurrent checkout is still
 * rejected here.
 */
export async function reserveCoupon(
  supabase: ServiceClient,
  params: { couponId: string; userId: string; orderId: string; discountAmount: number }
): Promise<CouponReservation> {
  const { data, error } = await (supabase.rpc as any)('redeem_coupon', {
    p_coupon_id: params.couponId,
    p_user_id: params.userId,
    p_order_id: params.orderId,
    p_discount: params.discountAmount,
  });

  if (error) {
    if (isMissingFunctionError(error, 'redeem_coupon')) {
      return {
        ok: false,
        reason: 'not_found',
        message: COUPON_UNAVAILABLE_MESSAGE,
        status: 503,
      };
    }

    console.error('[Coupons] Redeem failed:', params.couponId, error);
    return {
      ok: false,
      reason: 'not_found',
      message: 'Kupon doğrulanamadı, lütfen tekrar deneyin.',
      status: 503,
    };
  }

  const result = (data || {}) as {
    ok?: boolean;
    reason?: string;
    redemption_id?: string;
    discount_amount?: number;
  };

  if (result.ok === true) {
    return {
      ok: true,
      status: 200,
      redemptionId: result.redemption_id,
      discountAmount: Number(result.discount_amount) || params.discountAmount,
    };
  }

  const reason = isCouponRejectionReason(result.reason) ? result.reason : 'not_found';
  return {
    ok: false,
    reason,
    message: COUPON_ERROR_MESSAGES[reason],
    status: couponFailureStatus(reason),
  };
}

export async function consumeCoupon(orderId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await (supabase.rpc as any)('consume_coupon', { p_order_id: orderId });
  if (error && !isMissingFunctionError(error, 'consume_coupon')) {
    console.error('[Coupons] Consume failed:', orderId, error);
  }
}

/** Idempotent: a cancelled/failed order gives its slot back. */
export async function releaseCoupon(orderId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await (supabase.rpc as any)('release_coupon', { p_order_id: orderId });
  if (error && !isMissingFunctionError(error, 'release_coupon')) {
    console.error('[Coupons] Release failed:', orderId, error);
  }
}

function isCouponRejectionReason(value: string | undefined): value is CouponRejectionReason {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(COUPON_ERROR_MESSAGES, value)
  );
}
