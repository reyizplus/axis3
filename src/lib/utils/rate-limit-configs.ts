/**
 * Rate Limit Configurations
 * Different rate limits for different endpoint types.
 *
 * Limits are tracked in process memory only (no external Redis dependency).
 * State lives on `globalThis` so every route bundle inside one server process
 * shares the same counters even though each route imports its own copy.
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * The only surface the routes use.
 */
export interface RateLimiterInstance {
  limit(identifier: string): Promise<RateLimitResult>;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  buckets: Map<string, RateLimitRecord>;
  lastSweepAt: number;
}

const SWEEP_INTERVAL_MS = 60_000;

const globalStore = globalThis as typeof globalThis & {
  __axis3RateLimitStore?: RateLimitStore;
};

const store: RateLimitStore =
  globalStore.__axis3RateLimitStore ??
  (globalStore.__axis3RateLimitStore = { buckets: new Map(), lastSweepAt: 0 });

/**
 * Drop expired buckets so a long-running process cannot grow without bound.
 * Runs at most once per minute and only touches entries whose window ended.
 */
function sweepExpired(now: number): void {
  if (now - store.lastSweepAt < SWEEP_INTERVAL_MS) return;
  store.lastSweepAt = now;

  for (const [key, record] of store.buckets) {
    if (now > record.resetAt) store.buckets.delete(key);
  }
}

function consume(key: string, maxLimit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const record = store.buckets.get(key);

  if (!record || now > record.resetAt) {
    store.buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit: maxLimit, remaining: maxLimit - 1, reset: now + windowMs };
  }

  if (record.count >= maxLimit) {
    return { success: false, limit: maxLimit, remaining: 0, reset: record.resetAt };
  }

  record.count++;
  return { success: true, limit: maxLimit, remaining: maxLimit - record.count, reset: record.resetAt };
}

let warnedAboutInstanceLimits = false;

/**
 * Limits are per server instance. Warn once in production so nobody assumes
 * they are global across a multi-instance deployment.
 */
function warnInstanceLimitsOnce(prefix: string): void {
  if (warnedAboutInstanceLimits) return;
  warnedAboutInstanceLimits = true;

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      `[RateLimit] In-memory rate limiter aktif (${prefix}). Limitler sunucu instance'i ` +
      'bazındadır; birden fazla instance çalıştırıldığında toplam limit instance sayısıyla çarpılır.'
    );
  }
}

function createLimiter(prefix: string, maxLimit: number, windowMs: number): RateLimiterInstance {
  warnInstanceLimitsOnce(prefix);

  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      return consume(`${prefix}:${identifier}`, maxLimit, windowMs);
    },
  };
}

/**
 * Contact Form Rate Limiter
 * 5 requests per 10 minutes per IP
 */
export function createContactRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:contact', 5, 600000);
}

/**
 * Payment Rate Limiter
 * 3 requests per 10 seconds per IP (fraud protection)
 */
export function createPaymentRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:payment', 3, 10000);
}

/**
 * Auth Rate Limiter
 * 5 requests per 10 seconds per IP (brute force protection)
 */
export function createAuthRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:auth', 5, 10000);
}

/**
 * Upload Rate Limiter
 * 10 requests per 1 hour per IP
 */
export function createUploadRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:upload', 10, 3600000);
}

/**
 * Admin Rate Limiter
 * 30 requests per 10 seconds per IP
 */
export function createAdminRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:admin', 30, 10000);
}

/**
 * Generic Rate Limiter
 * 10 requests per 10 seconds per IP
 */
export function createGenericRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:generic', 10, 10000);
}

/**
 * Order Quote Rate Limiter
 * 30 requests per 10 seconds per user.
 *
 * Sepette adet değiştirmek her seferinde bir teklif isteği üretir; sayaç
 * kullanıcıyı yanlışlıkla kilitlememeli, ama dilimleme tetikleyen uç nokta
 * sınırsız da kalmamalı.
 */
export function createQuoteRateLimiter(): RateLimiterInstance {
  return createLimiter('axis3:quote', 30, 10000);
}
