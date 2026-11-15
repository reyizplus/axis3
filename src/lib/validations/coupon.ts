/**
 * Validation schemas for the admin coupon endpoints.
 *
 * Shared by the single create route and the bulk route so both accept exactly
 * the same rule set; the service applies the business rules (ranges, dates).
 */

import { z } from 'zod';

const optionalDateString = z.string().trim().min(1).max(40).optional().nullable();

export const couponRulesSchema = z.object({
  description: z.string().max(500).optional().nullable(),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  discountValue: z.number().min(0).max(1_000_000),
  maxDiscountAmount: z.number().min(0).max(1_000_000).optional().nullable(),
  minOrderAmount: z.number().min(0).max(10_000_000).optional(),
  appliesTo: z.enum(['all', 'service', 'store']).optional(),
  startsAt: optionalDateString,
  endsAt: optionalDateString,
  validityDays: z.number().int().min(1).max(3650).optional().nullable(),
  quotaBasis: z.enum(['distinct_users', 'redemptions']).optional(),
  quotaLimit: z.number().int().min(1).max(1_000_000).optional().nullable(),
  perUserMode: z.enum(['single', 'unlimited', 'limited']).optional(),
  perUserLimit: z.number().int().min(1).max(10_000).optional().nullable(),
  firstOrderOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const createCouponSchema = couponRulesSchema.extend({
  code: z.string().trim().min(3).max(64).optional().nullable(),
  ownerUserId: z.string().uuid().optional().nullable(),
  ownerEmail: z.string().trim().email('Geçerli bir e-posta adresi giriniz').max(254).optional().nullable(),
  isPersonal: z.boolean().optional(),
  batchLabel: z.string().trim().max(120).optional().nullable(),
});

export const updateCouponSchema = couponRulesSchema.partial().extend({
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const bulkGenerateSchema = couponRulesSchema.extend({
  count: z.number().int().min(1).max(500),
  codePrefix: z.string().trim().max(10).optional().nullable(),
  batchLabel: z.string().trim().max(120).optional().nullable(),
  ownerEmails: z
    .array(z.string().trim().email('Geçerli bir e-posta adresi giriniz').max(254))
    .max(500)
    .optional(),
});

export const listCouponsQuerySchema = z.object({
  status: z
    .enum(['all', 'active', 'scheduled', 'exhausted', 'expired', 'inactive', 'used'])
    .optional(),
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
