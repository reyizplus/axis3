import { createServiceClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
}

const limits: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowSeconds: 900 },
  register: { maxAttempts: 3, windowSeconds: 900 },
  'password-reset': { maxAttempts: 3, windowSeconds: 900 },
  '2fa': { maxAttempts: 5, windowSeconds: 900 },
  'verify-email': { maxAttempts: 3, windowSeconds: 900 },
  totp: { maxAttempts: 3, windowSeconds: 900 },
};

export async function checkRateLimit(
  key: string,
  type: keyof typeof limits = 'login'
): Promise<{ allowed: boolean; remaining: number; resetAt: Date | null }> {
  const config = limits[type];
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: null };
  }

  const supabase = createServiceClient();
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000);

  const { count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('action', `rate_limit:${type}`)
    .eq('entity_id', key)
    .gte('created_at', windowStart.toISOString());

  const attemptCount = count || 0;
  const allowed = attemptCount < config.maxAttempts;
  const resetAt = allowed ? null : new Date(windowStart.getTime() + config.windowSeconds * 1000);

  return { allowed, remaining: Math.max(0, config.maxAttempts - attemptCount), resetAt };
}

export async function recordRateLimitAttempt(
  key: string,
  type: keyof typeof limits = 'login',
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from('audit_logs').insert({
    user_id: null,
    action: `rate_limit:${type}`,
    entity_type: 'rate_limit',
    entity_id: key,
    new_values: (metadata || {}) as Json,
    ip_address: null,
    user_agent: null,
  });
}
