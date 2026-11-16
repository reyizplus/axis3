import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verification code hashing.
 *
 * Codes are 6 digits (10^6 possibilities), so a plain hash would be trivial to
 * reverse offline. They are therefore hashed with an HMAC whose key never
 * leaves the server (ENCRYPTION_KEY, the same secret already required by the
 * auth crypto helpers).
 *
 * The email is part of the message so a hash cannot be replayed for another
 * account, even if two users happen to receive the same code.
 */

const HASH_PREFIX = 'hmac-sha256:';

const DEV_FALLBACK_SECRET = 'axis3-dev-verification-pepper';
let warnedAboutFallback = false;

function getPepper(): string {
  const key =
    process.env.VERIFICATION_CODE_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (key && key.length >= 32) {
    return key.padEnd(32, 'x').slice(0, 32);
  }

  // Registration and login must keep working in local development even when
  // the encryption secret is not configured. Production fails closed instead
  // of silently hashing with a public constant.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'VERIFICATION_CODE_SECRET (or ENCRYPTION_KEY) must be set to at least 32 characters'
    );
  }

  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      '[verification-code] VERIFICATION_CODE_SECRET/ENCRYPTION_KEY is not set; ' +
      'using an insecure development pepper for verification codes.'
    );
  }

  return DEV_FALLBACK_SECRET;
}

export function normalizeVerificationCode(code: string): string {
  return code.replace(/\s+/g, '');
}

export function hashVerificationCode(code: string, email: string): string {
  const digest = createHmac('sha256', getPepper())
    .update(`${email.toLowerCase()}:${normalizeVerificationCode(code)}`)
    .digest('hex');
  return `${HASH_PREFIX}${digest}`;
}

/**
 * Constant-time comparison of a user supplied code against a stored hash.
 * Returns false for legacy plaintext rows (code_hash is null), which forces a
 * fresh code to be requested after the hardening migration.
 */
export function matchesVerificationCode(
  code: string,
  email: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash || !storedHash.startsWith(HASH_PREFIX)) {
    return false;
  }

  const expected = Buffer.from(hashVerificationCode(code, email), 'utf8');
  const actual = Buffer.from(storedHash, 'utf8');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
