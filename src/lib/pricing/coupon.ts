/**
 * Kupon kuralları (saf / pure).
 *
 * Bu modül istemci ve sunucuda AYNI şekilde çalışır: sepet ekranındaki
 * önizleme ile sipariş oluştururken yapılan kesin hesap aynı fonksiyondan
 * geçer. Böylece iki tarafın farklı yuvarlaması "fiyat güncellendi" hatasına
 * dönüşmez.
 *
 * Kural seti (admin panelden seçilir):
 * - indirim türü: yüzde / sabit tutar / ücretsiz kargo
 * - kapsam: tümü / sadece 3D / sadece mağaza
 * - kota: farklı kişi sayısı ya da toplam kullanım sayısı
 * - kullanıcı başına: tek kullanım / sınırsız / N kez
 * - geçerlilik penceresi: startsAt / endsAt
 * - ilk sipariş koşulu
 * - kişiye özel kod (ownerUserId)
 *
 * DB tarafındaki karşılıkları: `supabase/migrations/100_coupon_system.sql`.
 */

import { roundMoney } from '@/lib/utils/money';

export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type CouponAppliesTo = 'all' | 'service' | 'store';
export type CouponQuotaBasis = 'distinct_users' | 'redemptions';
export type CouponPerUserMode = 'single' | 'unlimited' | 'limited';

export interface CouponRules {
  discountType: CouponDiscountType;
  /** Yüzde için 0-100, sabit tutar için TL. Ücretsiz kargoda kullanılmaz. */
  discountValue: number;
  /** Yüzde indirimde üst sınır (TL). null/undefined = sınırsız. */
  maxDiscountAmount?: number | null;
  /** İndirim öncesi sepet tutarı için alt sınır (TL). */
  minOrderAmount?: number | null;
  appliesTo?: CouponAppliesTo;
  quotaBasis?: CouponQuotaBasis;
  /** null/undefined = sınırsız kota. */
  quotaLimit?: number | null;
  perUserMode?: CouponPerUserMode;
  /** Yalnızca perUserMode === 'limited' iken anlamlı. */
  perUserLimit?: number | null;
  firstOrderOnly?: boolean;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  isActive?: boolean;
  /** Doluysa kod yalnızca bu kullanıcıda geçerlidir. */
  ownerUserId?: string | null;
  /** Kota dolduğunda DB tarafından yazılır. */
  exhaustedAt?: string | Date | null;
}

export interface CouponEvaluationInput {
  rules: CouponRules;
  /** 3D baskı + mağaza kalem toplamı (kalem indirimleri dahil). */
  itemsSubtotal: number;
  serviceSubtotal: number;
  storeSubtotal: number;
  userId: string;
  /** İlk sipariş koşulu için: bu siparişten önceki sipariş sayısı. */
  previousOrderCount?: number;
  /** Kullanıcının bu kampanyadaki rezerve/tüketilmiş kullanım sayısı. */
  userRedemptionCount?: number;
  /** Kampanyada indirimden yararlanan farklı kullanıcı sayısı. */
  campaignUserCount?: number;
  /** Kampanyadaki toplam kullanım sayısı. */
  campaignRedemptionCount?: number;
  now?: Date;
}

export type CouponRejectionReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'empty_cart'
  | 'not_applicable'
  | 'min_order'
  | 'first_order_only'
  | 'quota_exhausted'
  | 'user_limit'
  | 'invalid_value';

export type CouponEvaluation =
  | {
      valid: true;
      /** İndirimin uygulandığı alt toplam (kapsam seçimine göre). */
      discountBase: number;
      /** Kuruşa yuvarlanmış indirim tutarı. Ücretsiz kargoda 0. */
      discountAmount: number;
      freeShipping: boolean;
    }
  | {
      valid: false;
      reason: CouponRejectionReason;
      message: string;
    };

/**
 * Kullanıcıya gösterilecek mesajlar tek yerde. `not_found` bilinçli olarak
 * geneldir: kişiye özel bir kodun varlığı başka kullanıcıya sızdırılmaz.
 */
export const COUPON_ERROR_MESSAGES: Record<CouponRejectionReason, string> = {
  not_found: 'Kupon bulunamadı',
  inactive: 'Bu kupon artık geçerli değil',
  not_started: 'Bu kupon henüz başlamadı',
  expired: 'Bu kuponun süresi doldu',
  empty_cart: 'Sepetiniz boş',
  not_applicable: 'Bu kupon sepetinizdeki ürünler için geçerli değil',
  min_order: 'Bu kupon için minimum sepet tutarı karşılanmıyor',
  first_order_only: 'Bu kupon yalnızca ilk siparişinizde geçerli',
  quota_exhausted: 'Bu kuponun kullanım kotası doldu',
  user_limit: 'Bu kupon için kullanım limitinize ulaştınız',
  invalid_value: 'Bu kupon indirim sağlamıyor',
};

/** Kuponun indirim uygulayacağı alt toplam. */
export function getCouponDiscountBase(
  rules: Pick<CouponRules, 'appliesTo'>,
  subtotals: { itemsSubtotal: number; serviceSubtotal: number; storeSubtotal: number }
): number {
  const items = safeAmount(subtotals.itemsSubtotal);
  const service = safeAmount(subtotals.serviceSubtotal);
  const store = safeAmount(subtotals.storeSubtotal);

  switch (rules.appliesTo) {
    case 'service':
      return service;
    case 'store':
      return store;
    default:
      return items;
  }
}

/**
 * İndirim tutarını hesaplar. Uygunluk kontrolü YAPMAZ; `evaluateCoupon`
 * çağırmadan kullanılmamalıdır (admin önizlemesi hariç).
 */
export function calculateCouponDiscount(
  rules: Pick<
    CouponRules,
    'discountType' | 'discountValue' | 'maxDiscountAmount'
  >,
  baseAmount: number
): number {
  const base = safeAmount(baseAmount);
  if (base <= 0) return 0;

  const value = Number(rules.discountValue);

  if (rules.discountType === 'free_shipping') return 0;

  if (rules.discountType === 'percentage') {
    if (!Number.isFinite(value) || value <= 0) return 0;
    const percentage = Math.min(100, value);
    const raw = base * (percentage / 100);
    const cap = Number(rules.maxDiscountAmount);
    const capped =
      Number.isFinite(cap) && cap > 0 ? Math.min(raw, cap) : raw;
    return roundMoney(Math.min(Math.max(capped, 0), base));
  }

  // fixed_amount
  if (!Number.isFinite(value) || value <= 0) return 0;
  return roundMoney(Math.min(value, base));
}

/**
 * Tüm kuralları sırayla uygular ve indirimi hesaplar.
 *
 * Sıra önemlidir: sahiplik ve durum bilgisi, tutar koşullarından önce
 * kontrol edilir. Böylece süresi dolmuş bir kod "minimum tutar" hatası verip
 * kafa karıştırmaz.
 */
export function evaluateCoupon(input: CouponEvaluationInput): CouponEvaluation {
  const { rules } = input;
  const now = input.now ?? new Date();

  const reject = (reason: CouponRejectionReason): CouponEvaluation => ({
    valid: false,
    reason,
    message: COUPON_ERROR_MESSAGES[reason],
  });

  // 1) Kişiye özel kod: başka kullanıcıya varlığı sızdırılmaz.
  if (rules.ownerUserId && rules.ownerUserId !== input.userId) {
    return reject('not_found');
  }

  // 2) Durum.
  if (rules.isActive === false) return reject('inactive');
  if (rules.exhaustedAt) return reject('quota_exhausted');

  // 3) Geçerlilik penceresi.
  const startsAt = toDate(rules.startsAt);
  const endsAt = toDate(rules.endsAt);
  if (startsAt && now.getTime() < startsAt.getTime()) return reject('not_started');
  if (endsAt && now.getTime() > endsAt.getTime()) return reject('expired');

  // 4) Sepet ve kapsam.
  if (safeAmount(input.itemsSubtotal) <= 0) return reject('empty_cart');

  const discountBase = getCouponDiscountBase(rules, input);
  if (discountBase <= 0) return reject('not_applicable');

  // 5) Minimum sepet tutarı indirim öncesi toplam üzerinden değerlendirilir.
  const minOrder = Number(rules.minOrderAmount);
  if (Number.isFinite(minOrder) && minOrder > 0 && safeAmount(input.itemsSubtotal) < minOrder) {
    return reject('min_order');
  }

  // 6) İlk sipariş koşulu.
  if (rules.firstOrderOnly && Number(input.previousOrderCount ?? 0) > 0) {
    return reject('first_order_only');
  }

  // 7) Kampanya kotası.
  const quotaLimit = Number(rules.quotaLimit);
  if (Number.isFinite(quotaLimit) && quotaLimit > 0) {
    const used =
      rules.quotaBasis === 'redemptions'
        ? Number(input.campaignRedemptionCount ?? 0)
        : Number(input.campaignUserCount ?? 0);
    if (used >= quotaLimit) return reject('quota_exhausted');
  }

  // 8) Kullanıcı başına kullanım.
  const userUses = Number(input.userRedemptionCount ?? 0);
  if (rules.perUserMode === 'single' && userUses >= 1) return reject('user_limit');
  if (rules.perUserMode === 'limited') {
    const perUserLimit = Number(rules.perUserLimit);
    const limit = Number.isFinite(perUserLimit) && perUserLimit > 0 ? perUserLimit : 1;
    if (userUses >= limit) return reject('user_limit');
  }

  // 9) İndirim.
  if (rules.discountType === 'free_shipping') {
    return { valid: true, discountBase, discountAmount: 0, freeShipping: true };
  }

  const discountAmount = calculateCouponDiscount(rules, discountBase);
  if (discountAmount <= 0) return reject('invalid_value');

  return { valid: true, discountBase, discountAmount, freeShipping: false };
}

function safeAmount(value: number | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
