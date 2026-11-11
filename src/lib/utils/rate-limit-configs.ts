/**
 * Rate Limit Configurations
 * Different rate limits for different endpoint types
 * Falls back to in-memory rate limiter when Upstash Redis is unavailable
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Skip rate limiting in development
const isDevelopment = process.env.NODE_ENV === 'development';

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

/**
 * Create Redis instance
 */
function createRedis(): Redis | null {
  if (isDevelopment) {
    return null;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

type RateLimiterInstance = Ratelimit | InMemoryRateLimiter;

/**
 * Contact Form Rate Limiter
 * 5 requests per 10 minutes per IP
 */
export function createContactRateLimiter(): RateLimiterInstance {
  const redis = createRedis();
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      analytics: true,
      prefix: 'axis3:contact',
    });
  }
  return new InMemoryRateLimiter(5, 600000);
}

/**
 * Payment Rate Limiter
 * 3 requests per 10 seconds per IP (fraud protection)
 */
export function createPaymentRateLimiter(): RateLimiterInstance {
  const redis = createRedis();
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '10 s'),
      analytics: true,
      prefix: 'axis3:payment',
    });
  }
  return new InMemoryRateLimiter(3, 10000);
}

/**
 * Auth Rate Limiter
 * 5 requests per 10 seconds per IP (brute force protection)
 */
export function createAuthRateLimiter(): RateLimiterInstance {
  const redis = createRedis();
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '10 s'),
      analytics: true,
      prefix: 'axis3:auth',
    });
  }
  return new InMemoryRateLimiter(5, 10000);
}

/**
 * Upload Rate Limiter
 * 10 requests per 1 hour per IP
 */
export function createUploadRateLimiter(): RateLimiterInstance {
  const redis = createRedis();
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
      prefix: 'axis3:upload',
    });
  }
  return new InMemoryRateLimiter(10, 3600000);
}

/**
 * Admin Rate Limiter
 * 30 requests per 10 seconds per IP
 */
export function createAdminRateLimiter(): RateLimiterInstance {
  const redis = createRedis();
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '10 s'),
      analytics: true,
      prefix: 'axis3:admin',
    });
  }
  return new InMemoryRateLimiter(30, 10000);
}

/**
 * Generic Rate Limiter
 * 10 requests per 10 seconds per IP
 */
export function createGenericRateLimiter(): RateLimiterInstance {
  const redis = createRedis();
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: 'axis3:generic',
    });
  }
  return new InMemoryRateLimiter(10, 10000);
}
