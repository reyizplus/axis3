/**
 * Rate Limit Configurations
 * Different rate limits for different endpoint types
 * Falls back to in-memory rate limiter when Upstash Redis is unavailable,
 * including when the configured Redis instance cannot be reached at runtime.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting must stay active in every environment. Upstash is used
// whenever credentials are present; otherwise we fall back to per-instance
// memory and warn loudly in production (limits are NOT global in that case).

/**
 * In-memory rate limiter fallback for when Redis is unavailable
 */
class InMemoryRateLimiter {
  private clients: Map<string, { count: number; resetAt: number }> = new Map();
  private maxLimit: number;
  private windowMs: number;

  constructor(maxLimit: number, windowMs: number) {
    this.maxLimit = maxLimit;
    this.windowMs = windowMs;
  }

  async limit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const record = this.clients.get(identifier);

    if (!record || now > record.resetAt) {
      this.clients.set(identifier, { count: 1, resetAt: now + this.windowMs });
      return { success: true, limit: this.maxLimit, remaining: this.maxLimit - 1, reset: now + this.windowMs };
    }

    if (record.count >= this.maxLimit) {
      return { success: false, limit: this.maxLimit, remaining: 0, reset: record.resetAt };
    }

    record.count++;
    return { success: true, limit: this.maxLimit, remaining: this.maxLimit - record.count, reset: record.resetAt };
  }
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * The only surface the routes use. Kept structural so both the Upstash limiter
 * and the in-memory fallback satisfy it.
 */
export interface RateLimiterInstance {
  limit(identifier: string): Promise<RateLimitResult>;
}

let warnedAboutMemoryFallback = false;
let warnedAboutRedisFailure = false;

/**
 * After a Redis failure every request would otherwise wait for the client
 * timeout again. Skip Redis for a minute and let the in-memory limiter serve
 * traffic meanwhile.
 */
let redisUnavailableUntil = 0;
const REDIS_RETRY_COOLDOWN_MS = 60_000;

function warnMemoryFallbackOnce(): void {
  if (warnedAboutMemoryFallback) return;
  warnedAboutMemoryFallback = true;

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[RateLimit] UPSTASH_REDIS_REST_URL/TOKEN tanımlı değil. In-memory fallback kullanılıyor: ' +
      'çok instance/serverless ortamda limitler GLOBAL DEĞİLDİR. Production için Upstash yapılandırın.'
    );
  }
}

function warnRedisFailureOnce(prefix: string, error: unknown): void {
  if (warnedAboutRedisFailure) return;
  warnedAboutRedisFailure = true;

  console.warn(
    `[RateLimit] Upstash Redis (${prefix}) kullanılamıyor; ` +
    'in-memory fallback aktif. Limitler bu süre boyunca instance bazlıdır.',
    error instanceof Error ? error.message : error
  );
}

/**
 * Create Redis instance. One quick retry keeps a transient blip from dropping
 * the distributed limiter, while a dead endpoint fails fast into the fallback.
 */
function createRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    warnMemoryFallbackOnce();
    return null;
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    retry: { retries: 1, backoff: () => 100 },
  });
}

function createLimiter(
  prefix: string,
  maxLimit: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
  windowMs: number
): RateLimiterInstance {
  const fallback = new InMemoryRateLimiter(maxLimit, windowMs);

  if (Date.now() < redisUnavailableUntil) return fallback;

  const redis = createRedis();
  if (!redis) return fallback;

  const primary = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxLimit, window),
    analytics: true,
    prefix,
  });

  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      if (Date.now() < redisUnavailableUntil) return fallback.limit(identifier);

      try {
        return await primary.limit(identifier);
      } catch (error) {
        redisUnavailableUntil = Date.now() + REDIS_RETRY_COOLDOWN_MS;
        warnRedisFailureOnce(prefix, error);
        return fallback.limit(identifier);
      }
    },
  };
}

/**
 * Contact Form Rate Limiter
 * 5 requests per 10 minutes per IP
 */
export function createContactRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:contact', 5, '10 m', 600000);
}

/**
 * Payment Rate Limiter
 * 3 requests per 10 seconds per IP (fraud protection)
 */
export function createPaymentRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:payment', 3, '10 s', 10000);
}

/**
 * Auth Rate Limiter
 * 5 requests per 10 seconds per IP (brute force protection)
 */
export function createAuthRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:auth', 5, '10 s', 10000);
}

/**
 * Upload Rate Limiter
 * 10 requests per 1 hour per IP
 */
export function createUploadRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:upload', 10, '1 h', 3600000);
}

/**
 * Admin Rate Limiter
 * 30 requests per 10 seconds per IP
 */
export function createAdminRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:admin', 30, '10 s', 10000);
}

/**
 * Generic Rate Limiter
 * 10 requests per 10 seconds per IP
 */
export function createGenericRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:generic', 10, '10 s', 10000);
}
