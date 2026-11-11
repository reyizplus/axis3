/**
 * Rate Limiting Utility
 * Uses Upstash Redis for distributed rate limiting
 * 
 * Usage:
 * import { rateLimit } from '@/lib/utils/rate-limit';
 * 
 * const { success } = await rateLimit(request);
 * if (!success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create rate limiter instance
// Note: Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env variables
class InMemoryRateLimiter {
  private clients: Map<string, { count: number; resetAt: number }> = new Map();
  private maxLimit: number;
  private windowMs: number;

  constructor(maxLimit = 5, windowMs = 600000) {
    this.maxLimit = maxLimit;
    this.windowMs = windowMs;
  }

  async check(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
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

let rateLimiter: Ratelimit | InMemoryRateLimiter | null = null;

function getRateLimiter(): Ratelimit | InMemoryRateLimiter | null {
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  if (!rateLimiter) {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      rateLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '10 m'),
        analytics: true,
        prefix: 'axis3:ratelimit',
      });
    } else {
      rateLimiter = new InMemoryRateLimiter(5, 600000);
    }
  }

  return rateLimiter;
}

/**
 * Rate limit a request
 * @param request - Next.js request object
 * @param identifier - Optional custom identifier (defaults to IP)
 * @returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function rateLimit(
  request: Request,
  identifier?: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const limiter = getRateLimiter();

  // If rate limiter is not configured, allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }

  // Get identifier (IP address or custom)
  const id = identifier || getClientIp(request);

  // Check rate limit
  const { success, limit, remaining, reset } = await (limiter as any).check(id);

  if (!success) {
      }

  return { success, limit, remaining, reset };
}

/**
 * Get client IP address from request
 */
function getClientIp(request: Request): string {
  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'unknown';
}

/**
 * Rate limit middleware for API routes
 * Usage:
 * export async function POST(request: Request) {
 *   const rateLimitResult = await rateLimitMiddleware(request);
 *   if (rateLimitResult) return rateLimitResult;
 *   // ... rest of handler
 * }
 */
export async function rateLimitMiddleware(
  request: Request
): Promise<Response | null> {
  const { success, limit, remaining, reset } = await rateLimit(request);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Custom rate limiter for specific endpoints
 * @param requests - Number of requests allowed
 * @param window - Time window (e.g., '10 s', '1 m', '1 h')
 */
export function createRateLimiter(requests: number, window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`) {
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: 'axis3:ratelimit',
  });
}
