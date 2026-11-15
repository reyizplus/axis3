'use client';

/**
 * Rule fields shared by the single-code and bulk-generation dialogs.
 *
 * Keeps the two forms identical: both send the same camelCase payload that
 * `/api/admin/coupons` validates with `couponRulesSchema`.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  AdminCoupon,
  CouponAppliesTo,
  CouponDiscountType,
  CouponPerUserMode,
  CouponQuotaBasis,
  CouponRulePayload,
} from '@/lib/services/admin-coupon-client-service';

export type CouponValidityMode = 'unlimited' | 'range' | 'days';

export interface CouponRuleFormState {
  description: string;
  discountType: CouponDiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  appliesTo: CouponAppliesTo;
  quotaEnabled: boolean;
  quotaBasis: CouponQuotaBasis;
  quotaLimit: string;
  perUserMode: CouponPerUserMode;
  perUserLimit: string;
  firstOrderOnly: boolean;
  isActive: boolean;
  validityMode: CouponValidityMode;
  startsAt: string;
  endsAt: string;
  validityDays: string;
}

export function createEmptyRuleState(
  overrides: Partial<CouponRuleFormState> = {}
): CouponRuleFormState {
  return {
    description: '',
    discountType: 'percentage',
    discountValue: '10',
    maxDiscountAmount: '',
    minOrderAmount: '',
    appliesTo: 'all',
    quotaEnabled: false,
    quotaBasis: 'distinct_users',
    quotaLimit: '',
    perUserMode: 'single',
    perUserLimit: '',
    firstOrderOnly: false,
    isActive: true,
    validityMode: 'unlimited',
    startsAt: '',
    endsAt: '',
    validityDays: '30',
    ...overrides,
  };
}

/** ISO timestamp → `datetime-local` value in the browser's timezone. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function ruleStateFromCoupon(coupon: AdminCoupon): CouponRuleFormState {
  return createEmptyRuleState({
    description: coupon.description ?? '',
    discountType: coupon.discount_type,
    discountValue: String(coupon.discount_value ?? 0),
    maxDiscountAmount:
      coupon.max_discount_amount != null ? String(coupon.max_discount_amount) : '',
    minOrderAmount: coupon.min_order_amount ? String(coupon.min_order_amount) : '',
    appliesTo: coupon.applies_to,
    quotaEnabled: coupon.quota_limit != null,
    quotaBasis: coupon.quota_basis,
    quotaLimit: coupon.quota_limit != null ? String(coupon.quota_limit) : '',
    perUserMode: coupon.per_user_mode,
    perUserLimit: coupon.per_user_limit != null ? String(coupon.per_user_limit) : '',
    firstOrderOnly: coupon.first_order_only,
    isActive: coupon.is_active,
    validityMode: coupon.starts_at || coupon.ends_at ? 'range' : 'unlimited',
    startsAt: toLocalInputValue(coupon.starts_at),
    endsAt: toLocalInputValue(coupon.ends_at),
  });
}

/** Client-side guard so obvious mistakes do not need a round trip. */
export function validateRuleState(state: CouponRuleFormState): string | null {
  const value = Number(state.discountValue);
  if (state.discountType === 'percentage') {
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      return 'Yüzde indirim 1 ile 100 arasında olmalıdır';
    }
  } else if (state.discountType === 'fixed_amount') {
    if (!Number.isFinite(value) || value <= 0) {
      return 'İndirim tutarı 0’dan büyük olmalıdır';
    }
  }

  if (state.validityMode === 'days') {
    const days = Number(state.validityDays);
    if (!Number.isFinite(days) || days < 1) return 'Geçerlilik gün sayısı en az 1 olmalıdır';
  }

  if (state.validityMode === 'range' && !state.endsAt) {
    return 'Bitiş tarihi seçin veya süresiz seçeneğini kullanın';
  }

  if (state.quotaEnabled) {
    const limit = Number(state.quotaLimit);
    if (!Number.isFinite(limit) || limit < 1) return 'Kota en az 1 olmalıdır';
  }

  if (state.perUserMode === 'limited') {
    const limit = Number(state.perUserLimit);
    if (!Number.isFinite(limit) || limit < 1) return 'Kullanıcı başına limit en az 1 olmalıdır';
  }

  return null;
}

export function ruleStateToPayload(state: CouponRuleFormState): CouponRulePayload {
  const startsAt =
    state.validityMode === 'range' && state.startsAt
      ? new Date(state.startsAt).toISOString()
      : null;
  const endsAt =
    state.validityMode === 'range' && state.endsAt ? new Date(state.endsAt).toISOString() : null;
  const validityDays =
    state.validityMode === 'days' ? Math.max(1, Number(state.validityDays) || 1) : null;

  return {
    description: state.description.trim() || null,
    discountType: state.discountType,
    discountValue:
      state.discountType === 'free_shipping' ? 0 : Number(state.discountValue) || 0,
    maxDiscountAmount:
      state.discountType === 'percentage' && state.maxDiscountAmount
        ? Number(state.maxDiscountAmount)
        : null,
    minOrderAmount: Number(state.minOrderAmount) || 0,
    appliesTo: state.appliesTo,
    startsAt,
    endsAt,
    validityDays,
    quotaBasis: state.quotaBasis,
    quotaLimit: state.quotaEnabled ? Number(state.quotaLimit) || null : null,
    perUserMode: state.perUserMode,
    perUserLimit:
      state.perUserMode === 'limited' ? Math.max(1, Number(state.perUserLimit) || 1) : null,
    firstOrderOnly: state.firstOrderOnly,
    isActive: state.isActive,
  };
}

const selectClass =
  'flex h-9 w-full rounded-xl border-2 border-border/60 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50';

const DISCOUNT_LABELS: Record<CouponDiscountType, string> = {
  percentage: 'Yüzde indirim',
  fixed_amount: 'Sabit tutar',
  free_shipping: 'Ücretsiz kargo',
};

const APPLIES_LABELS: Record<CouponAppliesTo, string> = {
  all: 'Tüm sepet',
  service: 'Sadece 3D baskı',
  store: 'Sadece mağaza',
};

interface Props {
  value: CouponRuleFormState;
  onChange: (next: CouponRuleFormState) => void;
  disabled?: boolean;
}

export function CouponRulesFields({ value, onChange, disabled = false }: Props) {
  const set = <K extends keyof CouponRuleFormState>(key: K, next: CouponRuleFormState[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Açıklama</Label>
        <Input
          value={value.description}
          onChange={(event) => set('description', event.target.value)}
          placeholder="Örn. İlk siparişe %10 indirim"
          maxLength={500}
          disabled={disabled}
          className="h-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">İndirim türü *</Label>
          <select
            className={selectClass}
            value={value.discountType}
            onChange={(event) => set('discountType', event.target.value as CouponDiscountType)}
            disabled={disabled}
          >
            {Object.entries(DISCOUNT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            {value.discountType === 'percentage'
              ? 'Yüzde (%)'
              : value.discountType === 'fixed_amount'
                ? 'Tutar (TL)'
                : 'Değer'}
          </Label>
          <Input
            type="number"
            min={0}
            max={value.discountType === 'percentage' ? 100 : undefined}
            step="0.01"
            value={value.discountType === 'free_shipping' ? '' : value.discountValue}
            onChange={(event) => set('discountValue', event.target.value)}
            placeholder={value.discountType === 'percentage' ? '10' : '100.00'}
            disabled={disabled || value.discountType === 'free_shipping'}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Maks. indirim (TL)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={value.maxDiscountAmount}
            onChange={(event) => set('maxDiscountAmount', event.target.value)}
            placeholder="Sınırsız"
            disabled={disabled || value.discountType !== 'percentage'}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Kapsam *</Label>
          <select
            className={selectClass}
            value={value.appliesTo}
            onChange={(event) => set('appliesTo', event.target.value as CouponAppliesTo)}
            disabled={disabled}
          >
            {Object.entries(APPLIES_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Min. sepet tutarı (TL)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={value.minOrderAmount}
            onChange={(event) => set('minOrderAmount', event.target.value)}
            placeholder="0"
            disabled={disabled}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.quotaEnabled}
            onChange={(event) => set('quotaEnabled', event.target.checked)}
            disabled={disabled}
            className="rounded border-input"
          />
          <span className="text-sm font-medium">Kota sınırı</span>
        </label>

        {value.quotaEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Kota bazı</Label>
              <select
                className={selectClass}
                value={value.quotaBasis}
                onChange={(event) => set('quotaBasis', event.target.value as CouponQuotaBasis)}
                disabled={disabled}
              >
                <option value="distinct_users">Farklı kişi sayısı</option>
                <option value="redemptions">Toplam kullanım sayısı</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kota *</Label>
              <Input
                type="number"
                min={1}
                step="1"
                value={value.quotaLimit}
                onChange={(event) => set('quotaLimit', event.target.value)}
                placeholder="100"
                disabled={disabled}
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Kullanıcı başına kullanım *</Label>
            <select
              className={selectClass}
              value={value.perUserMode}
              onChange={(event) => set('perUserMode', event.target.value as CouponPerUserMode)}
              disabled={disabled}
            >
              <option value="single">Tek kullanım</option>
              <option value="unlimited">Sınırsız</option>
              <option value="limited">Belirli sayıda</option>
            </select>
          </div>

          {value.perUserMode === 'limited' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Kullanım hakkı *</Label>
              <Input
                type="number"
                min={1}
                step="1"
                value={value.perUserLimit}
                onChange={(event) => set('perUserLimit', event.target.value)}
                placeholder="3"
                disabled={disabled}
                className="h-9 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Geçerlilik *</Label>
        <select
          className={selectClass}
          value={value.validityMode}
          onChange={(event) => set('validityMode', event.target.value as CouponValidityMode)}
          disabled={disabled}
        >
          <option value="unlimited">Süresiz</option>
          <option value="range">Tarih aralığı</option>
          <option value="days">Oluşturma + N gün</option>
        </select>

        {value.validityMode === 'range' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlangıç</Label>
              <Input
                type="datetime-local"
                value={value.startsAt}
                onChange={(event) => set('startsAt', event.target.value)}
                disabled={disabled}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bitiş *</Label>
              <Input
                type="datetime-local"
                value={value.endsAt}
                onChange={(event) => set('endsAt', event.target.value)}
                disabled={disabled}
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}

        {value.validityMode === 'days' && (
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs">Gün sayısı *</Label>
            <Input
              type="number"
              min={1}
              max={3650}
              step="1"
              value={value.validityDays}
              onChange={(event) => set('validityDays', event.target.value)}
              disabled={disabled}
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Kod oluşturulduğu andan itibaren bu kadar gün geçerli olur.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.firstOrderOnly}
            onChange={(event) => set('firstOrderOnly', event.target.checked)}
            disabled={disabled}
            className="rounded border-input"
          />
          <span className="text-sm">Yalnızca ilk sipariş</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
            disabled={disabled}
            className="rounded border-input"
          />
          <span className="text-sm">Aktif</span>
        </label>
      </div>
    </div>
  );
}
