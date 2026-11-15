/**
 * Admin coupon management (server-only).
 *
 * All writes go through the service role because the coupon tables are not
 * writable from the client at all. Route handlers still check `is_admin` with
 * the user's own session; this module only owns the data work.
 */

import { randomInt, randomUUID } from 'node:crypto';
import {
  COUPON_CODE_PATTERN,
  normalizeCouponCode,
  type CouponRow,
} from '@/lib/services/coupon-service';
import { createServiceClient } from '@/lib/supabase/server';
import { isMissingFunctionError, isMissingRelationError } from '@/lib/supabase/errors';

type ServiceClient = ReturnType<typeof createServiceClient>;

/** Generated `Database` types predate migration 100; keep the cast in one place. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function couponDb(supabase: ServiceClient): any {
  return supabase;
}

export const ADMIN_COUPON_MAX_LIST = 500;
export const ADMIN_COUPON_MAX_BULK = 500;

export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type CouponAppliesTo = 'all' | 'service' | 'store';
export type CouponQuotaBasis = 'distinct_users' | 'redemptions';
export type CouponPerUserMode = 'single' | 'unlimited' | 'limited';

export type AdminCouponStatus = 'active' | 'scheduled' | 'exhausted' | 'expired' | 'inactive';

export class AdminCouponError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
    this.name = 'AdminCouponError';
  }
}

export interface CouponRuleInput {
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  appliesTo?: CouponAppliesTo;
  startsAt?: string | null;
  endsAt?: string | null;
  /** "Oluşturma + N gün" convenience; ignored when `endsAt` is set. */
  validityDays?: number | null;
  quotaBasis?: CouponQuotaBasis;
  quotaLimit?: number | null;
  perUserMode?: CouponPerUserMode;
  perUserLimit?: number | null;
  firstOrderOnly?: boolean;
  isActive?: boolean;
}

export interface CreateCouponInput extends CouponRuleInput {
  code?: string | null;
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  isPersonal?: boolean;
  batchLabel?: string | null;
}

export interface UpdateCouponInput extends Partial<CouponRuleInput> {
  description?: string | null;
  isActive?: boolean;
}

interface CouponRecord extends CouponRow {
  created_at: string;
  updated_at: string;
  created_by: string | null;
  batch_label: string | null;
}

export interface AdminCoupon extends CouponRecord {
  campaign_key: string;
  status: AdminCouponStatus;
  usage: { users: number; redemptions: number };
  owner_email: string | null;
}

export interface ListCouponsOptions {
  status?: AdminCouponStatus | 'all' | 'used';
  search?: string;
  limit?: number;
}

function deriveStatus(coupon: CouponRecord, now: Date): AdminCouponStatus {
  if (coupon.is_active === false) return 'inactive';
  if (coupon.exhausted_at) return 'exhausted';
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now.getTime()) return 'expired';
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now.getTime()) return 'scheduled';
  return 'active';
}

/** PostgREST `or`/`ilike` syntax characters cannot appear literally in a search. */
function sanitizeSearch(search: string | undefined): string {
  return String(search ?? '')
    .trim()
    .replace(/[%,()\\*]/g, ' ')
    // `_` is a LIKE wildcard; codes may contain it, so it is escaped literally.
    .replace(/_/g, '\\_')
    .slice(0, 80);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function listCoupons(
  supabase: ServiceClient,
  options: ListCouponsOptions = {}
): Promise<AdminCoupon[]> {
  const limit = Math.min(
    Math.max(1, Number(options.limit) || ADMIN_COUPON_MAX_LIST),
    ADMIN_COUPON_MAX_LIST
  );
  const search = sanitizeSearch(options.search);

  let query = couponDb(supabase)
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(
      `code.ilike.%${search}%,description.ilike.%${search}%,batch_label.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error, 'coupons')) return [];
    console.error('[Admin Coupons] List failed:', error);
    throw new AdminCouponError('Kuponlar yüklenemedi', 500);
  }

  const coupons = (data ?? []) as CouponRecord[];
  if (coupons.length === 0) return [];

  const campaignKeys = Array.from(
    new Set(coupons.map((coupon) => coupon.batch_id || coupon.id))
  );
  const ownerIds = Array.from(
    new Set(coupons.map((coupon) => coupon.owner_user_id).filter((id): id is string => !!id))
  );

  const usageByCampaign = new Map<string, { users: number; redemptions: number }>();

  if (campaignKeys.length > 0) {
    const { data: usageRows } = await couponDb(supabase)
      .from('coupon_usage')
      .select('campaign_key, user_count, redemption_count')
      .in('campaign_key', campaignKeys);

    for (const row of (usageRows ?? []) as Array<{
      campaign_key: string;
      user_count: number;
      redemption_count: number;
    }>) {
      usageByCampaign.set(row.campaign_key, {
        users: Math.max(0, Number(row.user_count) || 0),
        redemptions: Math.max(0, Number(row.redemption_count) || 0),
      });
    }
  }

  const emailByOwner = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('users')
      .select('id, email')
      .in('id', ownerIds);

    for (const owner of owners ?? []) emailByOwner.set(owner.id, owner.email);
  }

  const now = new Date();
  const enriched = coupons.map((coupon): AdminCoupon => {
    const campaignKey = coupon.batch_id || coupon.id;
    return {
      ...coupon,
      campaign_key: campaignKey,
      status: deriveStatus(coupon, now),
      usage: usageByCampaign.get(campaignKey) ?? { users: 0, redemptions: 0 },
      owner_email: coupon.owner_user_id
        ? emailByOwner.get(coupon.owner_user_id) ?? null
        : null,
    };
  });

  const status = options.status;
  if (!status || status === 'all') return enriched;
  if (status === 'used') {
    return enriched.filter((coupon) => coupon.usage.redemptions > 0);
  }
  return enriched.filter((coupon) => coupon.status === status);
}

function parseDate(value: string | null | undefined, label: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AdminCouponError(`${label} geçersiz`);
  }
  return date.toISOString();
}

/** Validates the rule set and maps it to the DB column names. */
function buildRuleColumns(input: CouponRuleInput, now = new Date()): Record<string, unknown> {
  const discountType = input.discountType;
  if (!['percentage', 'fixed_amount', 'free_shipping'].includes(discountType)) {
    throw new AdminCouponError('Geçersiz indirim türü');
  }

  let discountValue = Number(input.discountValue) || 0;
  if (discountType === 'percentage') {
    if (discountValue <= 0 || discountValue > 100) {
      throw new AdminCouponError('Yüzde indirim 0 ile 100 arasında olmalıdır');
    }
  } else if (discountType === 'fixed_amount') {
    if (discountValue <= 0) {
      throw new AdminCouponError('Sabit indirim tutarı 0’dan büyük olmalıdır');
    }
  } else {
    discountValue = 0;
  }

  const minOrderAmount = Math.max(0, Number(input.minOrderAmount) || 0);
  const maxDiscountAmount =
    discountType === 'percentage' && input.maxDiscountAmount
      ? Math.max(0, Number(input.maxDiscountAmount))
      : null;

  const quotaLimit =
    input.quotaLimit === null || input.quotaLimit === undefined
      ? null
      : Math.max(0, Math.trunc(Number(input.quotaLimit))) || null;

  const perUserMode: CouponPerUserMode = input.perUserMode ?? 'single';
  const perUserLimit =
    perUserMode === 'limited'
      ? Math.max(1, Math.trunc(Number(input.perUserLimit) || 1))
      : null;

  const startsAt = parseDate(input.startsAt, 'Başlangıç tarihi');
  let endsAt = parseDate(input.endsAt, 'Bitiş tarihi');

  if (!endsAt && input.validityDays && Number(input.validityDays) > 0) {
    const days = Math.min(3650, Math.trunc(Number(input.validityDays)));
    endsAt = new Date(now.getTime() + days * 86_400_000).toISOString();
  }

  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new AdminCouponError('Bitiş tarihi başlangıçtan sonra olmalıdır');
  }

  return {
    description: input.description?.trim() || null,
    discount_type: discountType,
    discount_value: discountValue,
    max_discount_amount: maxDiscountAmount,
    min_order_amount: minOrderAmount,
    applies_to: input.appliesTo ?? 'all',
    starts_at: startsAt,
    ends_at: endsAt,
    quota_basis: input.quotaBasis ?? 'distinct_users',
    quota_limit: quotaLimit,
    per_user_mode: perUserMode,
    per_user_limit: perUserLimit,
    first_order_only: input.firstOrderOnly === true,
    is_active: input.isActive !== false,
  };
}

/** Codes are printed on cards, so avoid look-alike characters (0/O, 1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCodeBody(length: number): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

export function generateCouponCode(prefix = 'AX3'): string {
  return `${prefix}-${randomCodeBody(8)}`;
}

async function resolveOwnerId(
  supabase: ServiceClient,
  input: { ownerUserId?: string | null; ownerEmail?: string | null }
): Promise<string | null> {
  const email = input.ownerEmail?.trim().toLowerCase();
  if (email) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .ilike('email', escapeLike(email))
      .maybeSingle();

    if (error) throw new AdminCouponError('Kullanıcı sorgulanamadı', 500);
    if (!data) throw new AdminCouponError(`Kullanıcı bulunamadı: ${input.ownerEmail}`);
    return data.id;
  }

  return input.ownerUserId || null;
}

export async function createCoupon(
  supabase: ServiceClient,
  input: CreateCouponInput,
  adminId: string
): Promise<CouponRecord> {
  const ownerUserId = await resolveOwnerId(supabase, input);
  const isPersonal = input.isPersonal === true || !!ownerUserId;

  let code = input.code?.trim() ? normalizeCouponCode(input.code) : generateCouponCode();
  if (!COUPON_CODE_PATTERN.test(code)) {
    throw new AdminCouponError(
      'Kupon kodu 6-40 karakter olmalı; harf, rakam, tire ve alt çizgi kullanın'
    );
  }

  const row = {
    ...buildRuleColumns(input),
    code,
    is_personal: isPersonal,
    owner_user_id: ownerUserId,
    batch_label: input.batchLabel?.trim() || null,
    created_by: adminId,
  };

  // Auto-generated codes can collide on the unique index; retry a few times.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await couponDb(supabase)
      .from('coupons')
      .insert(row)
      .select('*')
      .single();

    if (!error) return data as CouponRecord;

    if (error.code === '23505') {
      if (input.code?.trim()) {
        throw new AdminCouponError('Bu kupon kodu zaten kullanılıyor', 409);
      }
      code = generateCouponCode();
      continue;
    }

    console.error('[Admin Coupons] Create failed:', error);
    throw new AdminCouponError('Kupon oluşturulamadı', 500);
  }

  throw new AdminCouponError('Kupon kodu üretilemedi, lütfen tekrar deneyin', 500);
}

export async function updateCoupon(
  supabase: ServiceClient,
  id: string,
  input: UpdateCouponInput
): Promise<CouponRecord> {
  const { data: existing, error: fetchError } = await couponDb(supabase)
    .from('coupons')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    console.error('[Admin Coupons] Fetch failed:', fetchError);
    throw new AdminCouponError('Kupon yüklenemedi', 500);
  }
  if (!existing) throw new AdminCouponError('Kupon bulunamadı', 404);

  const coupon = existing as CouponRecord;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const ruleKeys: Array<keyof CouponRuleInput> = [
    'discountType',
    'discountValue',
    'maxDiscountAmount',
    'minOrderAmount',
    'appliesTo',
    'startsAt',
    'endsAt',
    'validityDays',
    'quotaBasis',
    'quotaLimit',
    'perUserMode',
    'perUserLimit',
    'firstOrderOnly',
  ];
  const touchesRules = ruleKeys.some((key) => input[key] !== undefined);

  if (touchesRules) {
    const merged: CouponRuleInput = {
      discountType:
        input.discountType ?? (coupon.discount_type as CouponDiscountType) ?? 'percentage',
      discountValue:
        input.discountValue !== undefined
          ? input.discountValue
          : Number(coupon.discount_value) || 0,
      maxDiscountAmount:
        input.maxDiscountAmount !== undefined
          ? input.maxDiscountAmount
          : coupon.max_discount_amount,
      minOrderAmount:
        input.minOrderAmount !== undefined ? input.minOrderAmount : coupon.min_order_amount,
      appliesTo: input.appliesTo ?? (coupon.applies_to as CouponAppliesTo) ?? 'all',
      startsAt: input.startsAt !== undefined ? input.startsAt : coupon.starts_at,
      endsAt: input.endsAt !== undefined ? input.endsAt : coupon.ends_at,
      validityDays: input.validityDays,
      quotaBasis:
        input.quotaBasis ?? (coupon.quota_basis as CouponQuotaBasis) ?? 'distinct_users',
      quotaLimit: input.quotaLimit !== undefined ? input.quotaLimit : coupon.quota_limit,
      perUserMode:
        input.perUserMode ?? (coupon.per_user_mode as CouponPerUserMode) ?? 'single',
      perUserLimit:
        input.perUserLimit !== undefined ? input.perUserLimit : coupon.per_user_limit,
      firstOrderOnly:
        input.firstOrderOnly !== undefined ? input.firstOrderOnly : coupon.first_order_only,
      isActive: input.isActive !== undefined ? input.isActive : coupon.is_active,
    };

    Object.assign(patch, buildRuleColumns(merged));
    // `is_active` is handled above; keep the explicit toggle authoritative.
    if (input.isActive !== undefined) patch.is_active = input.isActive;
  }

  /**
   * Quota and per-user rules are campaign-wide: the counters are keyed by
   * campaign, so a batch must keep the same limits on every code or the
   * effective rule becomes ambiguous.
   */
  const campaignWideKeys: Array<keyof CouponRuleInput> = [
    'quotaBasis',
    'quotaLimit',
    'perUserMode',
    'perUserLimit',
  ];
  const touchesCampaignWide = campaignWideKeys.some((key) => input[key] !== undefined);

  const { data, error } = await couponDb(supabase)
    .from('coupons')
    .update(patch)
    .eq('id', id)
    .select('*');
  if (error) {
    console.error('[Admin Coupons] Update failed:', error);
    throw new AdminCouponError('Kupon güncellenemedi', 500);
  }

  // Only the campaign-wide counters are projected onto every code of a batch;
  // description, discount and validity stay per code. Otherwise editing one
  // code would silently re-price the whole batch through the basic form.
  if (touchesCampaignWide && coupon.batch_id) {
    const { error: campaignError } = await couponDb(supabase)
      .from('coupons')
      .update({
        quota_basis: patch.quota_basis,
        quota_limit: patch.quota_limit,
        per_user_mode: patch.per_user_mode,
        per_user_limit: patch.per_user_limit,
        updated_at: patch.updated_at,
      })
      .eq('batch_id', coupon.batch_id);

    if (campaignError) {
      console.error('[Admin Coupons] Campaign rules update failed:', campaignError);
      throw new AdminCouponError('Kampanya kuralları güncellenemedi', 500);
    }
  }

  const campaignKey = coupon.batch_id || coupon.id;
  const { error: refreshError } = await (supabase.rpc as any)('refresh_coupon_exhaustion', {
    p_campaign_key: campaignKey,
  });
  if (refreshError && !isMissingFunctionError(refreshError, 'refresh_coupon_exhaustion')) {
    console.error('[Admin Coupons] Exhaustion refresh failed:', refreshError);
  }

  const updatedRows = (data ?? []) as CouponRecord[];
  const updated = updatedRows.find((row) => row.id === id) ?? updatedRows[0] ?? coupon;
  return updated;
}

export interface DeleteCouponResult {
  deleted: boolean;
  deactivated: boolean;
}

export async function deleteCoupon(
  supabase: ServiceClient,
  id: string
): Promise<DeleteCouponResult> {
  const { count, error: countError } = await couponDb(supabase)
    .from('coupon_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', id);

  if (countError) {
    console.error('[Admin Coupons] Redemption count failed:', countError);
    throw new AdminCouponError('Kupon kullanımı sorgulanamadı', 500);
  }

  // Deleting a redeemed code would break the order history, so deactivate it.
  if ((count ?? 0) > 0) {
    const { error } = await couponDb(supabase)
      .from('coupons')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new AdminCouponError('Kupon pasife alınamadı', 500);
    return { deleted: false, deactivated: true };
  }

  const { error } = await couponDb(supabase).from('coupons').delete().eq('id', id);
  if (error) {
    console.error('[Admin Coupons] Delete failed:', error);
    throw new AdminCouponError('Kupon silinemedi', 500);
  }
  return { deleted: true, deactivated: false };
}

export interface BulkGenerateInput extends CouponRuleInput {
  count: number;
  codePrefix?: string | null;
  batchLabel?: string | null;
  /** Optional assignment; the remaining codes stay unassigned and usable by anyone. */
  ownerEmails?: string[];
}

export interface BulkGenerateResult {
  batchId: string;
  codes: Array<{ code: string; ownerUserId: string | null; ownerEmail: string | null }>;
}

async function resolveOwnerIdsByEmail(
  supabase: ServiceClient,
  emails: string[]
): Promise<Array<{ id: string; email: string }>> {
  const cleaned = Array.from(
    new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))
  );
  if (cleaned.length === 0) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .in('email', cleaned);

  if (error) throw new AdminCouponError('Kullanıcılar sorgulanamadı', 500);

  const found = data ?? [];
  const foundEmails = new Set(found.map((user) => user.email.toLowerCase()));
  const missing = cleaned.filter((email) => !foundEmails.has(email));
  if (missing.length > 0) {
    throw new AdminCouponError(`Kullanıcı bulunamadı: ${missing.join(', ')}`);
  }

  // Preserve the order the admin typed so assignments line up predictably.
  const byEmail = new Map(found.map((user) => [user.email.toLowerCase(), user]));
  return cleaned.map((email) => {
    const user = byEmail.get(email)!;
    return { id: user.id, email: user.email };
  });
}

export async function bulkGenerateCoupons(
  supabase: ServiceClient,
  input: BulkGenerateInput,
  adminId: string
): Promise<BulkGenerateResult> {
  const count = Math.trunc(Number(input.count));
  if (!Number.isFinite(count) || count < 1 || count > ADMIN_COUPON_MAX_BULK) {
    throw new AdminCouponError(`Adet 1 ile ${ADMIN_COUPON_MAX_BULK} arasında olmalıdır`);
  }

  const owners = await resolveOwnerIdsByEmail(supabase, input.ownerEmails ?? []);
  if (owners.length > count) {
    throw new AdminCouponError(
      `Kullanıcı sayısı (${owners.length}) kod adedinden (${count}) fazla olamaz`
    );
  }

  const rawPrefix = (input.codePrefix ?? 'AX3').trim().toUpperCase();
  const prefix = /^[A-Z0-9]{2,10}$/.test(rawPrefix) ? rawPrefix : 'AX3';

  const batchId = randomUUID();
  const rules = buildRuleColumns(input);
  const now = new Date();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const codes = new Set<string>();
    while (codes.size < count) codes.add(generateCouponCode(prefix));
    const codeList = Array.from(codes);

    const rows = codeList.map((code, index) => ({
      ...rules,
      code,
      is_personal: true,
      owner_user_id: owners[index]?.id ?? null,
      batch_id: batchId,
      batch_label: input.batchLabel?.trim() || null,
      created_by: adminId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }));

    const { error } = await couponDb(supabase).from('coupons').insert(rows);

    if (!error) {
      return {
        batchId,
        codes: codeList.map((code, index) => ({
          code,
          ownerUserId: owners[index]?.id ?? null,
          ownerEmail: owners[index]?.email ?? null,
        })),
      };
    }

    if (error.code !== '23505') {
      console.error('[Admin Coupons] Bulk insert failed:', error);
      throw new AdminCouponError('Toplu kod üretimi başarısız oldu', 500);
    }
  }

  throw new AdminCouponError('Benzersiz kodlar üretilemedi, lütfen tekrar deneyin', 500);
}
