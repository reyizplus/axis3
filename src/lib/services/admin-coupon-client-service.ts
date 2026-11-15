/**
 * Browser-side client for the admin coupon API.
 *
 * The coupon tables are never read directly from the client; everything goes
 * through `/api/admin/coupons`, which checks `is_admin` first.
 */

export type AdminCouponStatus = 'active' | 'scheduled' | 'exhausted' | 'expired' | 'inactive';
export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type CouponAppliesTo = 'all' | 'service' | 'store';
export type CouponQuotaBasis = 'distinct_users' | 'redemptions';
export type CouponPerUserMode = 'single' | 'unlimited' | 'limited';

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  applies_to: CouponAppliesTo;
  starts_at: string | null;
  ends_at: string | null;
  quota_basis: CouponQuotaBasis;
  quota_limit: number | null;
  per_user_mode: CouponPerUserMode;
  per_user_limit: number | null;
  first_order_only: boolean;
  is_active: boolean;
  is_personal: boolean;
  owner_user_id: string | null;
  owner_email: string | null;
  batch_id: string | null;
  batch_label: string | null;
  exhausted_at: string | null;
  created_at: string;
  updated_at: string;
  campaign_key: string;
  status: AdminCouponStatus;
  usage: { users: number; redemptions: number };
}

export interface CouponRulePayload {
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  appliesTo?: CouponAppliesTo;
  startsAt?: string | null;
  endsAt?: string | null;
  validityDays?: number | null;
  quotaBasis?: CouponQuotaBasis;
  quotaLimit?: number | null;
  perUserMode?: CouponPerUserMode;
  perUserLimit?: number | null;
  firstOrderOnly?: boolean;
  isActive?: boolean;
}

export interface CreateCouponPayload extends CouponRulePayload {
  code?: string | null;
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  isPersonal?: boolean;
  batchLabel?: string | null;
}

export type UpdateCouponPayload = Partial<CouponRulePayload> & {
  description?: string | null;
  isActive?: boolean;
};

export interface BulkGeneratePayload extends CouponRulePayload {
  count: number;
  codePrefix?: string | null;
  batchLabel?: string | null;
  ownerEmails?: string[];
}

export interface BulkGenerateResult {
  batchId: string;
  codes: Array<{ code: string; ownerUserId: string | null; ownerEmail: string | null }>;
}

interface ApiErrorShape {
  error?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error((data as ApiErrorShape | null)?.error || 'İşlem başarısız oldu');
  }

  return data as T;
}

export const adminCouponClientService = {
  async list(params: {
    status?: AdminCouponStatus | 'all' | 'used';
    search?: string;
    limit?: number;
  } = {}): Promise<AdminCoupon[]> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.limit) query.set('limit', String(params.limit));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const data = await request<{ success: boolean; coupons: AdminCoupon[] }>(
      `/api/admin/coupons${suffix}`
    );
    return data.coupons ?? [];
  },

  async create(payload: CreateCouponPayload): Promise<AdminCoupon> {
    const data = await request<{ success: boolean; coupon: AdminCoupon }>('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.coupon;
  },

  async update(id: string, payload: UpdateCouponPayload): Promise<AdminCoupon> {
    const data = await request<{ success: boolean; coupon: AdminCoupon }>(
      `/api/admin/coupons/${id}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return data.coupon;
  },

  async remove(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
    const data = await request<{ success: boolean; deleted: boolean; deactivated: boolean }>(
      `/api/admin/coupons/${id}`,
      { method: 'DELETE' }
    );
    return { deleted: data.deleted, deactivated: data.deactivated };
  },

  async bulkGenerate(payload: BulkGeneratePayload): Promise<BulkGenerateResult> {
    return request<BulkGenerateResult & { success: boolean }>('/api/admin/coupons/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
