export function generateTOTPSecret(): string {
  const { randomBytes } = require('crypto');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = randomBytes(20);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += chars[bytes[i] % 32];
  }
  return secret;
}

export function generateTOTPQRCodeURL(secret: string, email: string): string {
  return `otpauth://totp/AXIS3:${encodeURIComponent(email)}?secret=${secret}&issuer=AXIS3`;
}

function hmacSha1(key: string, message: Buffer): Buffer {
  const crypto = require('crypto');
  // Decode base32 key
  const keyBytes = base32Decode(key);
  return crypto.createHmac('sha1', keyBytes).update(message).digest();
}

function base32Decode(s: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = s.replace(/=+$/, '').toUpperCase();
  const bits: string[] = [];
  for (const ch of cleaned) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    bits.push(idx.toString(2).padStart(5, '0'));
  }
  const allBits = bits.join('');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= allBits.length; i += 8) {
    bytes.push(parseInt(allBits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret: string, timestamp: number): string {
  let counter = Math.floor(timestamp / 30000);
  const counterBuf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = counter & 0xff;
    counter >>>= 8;
  }
  const hmac = hmacSha1(secret, counterBuf);
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

export function verifyTOTP(secret: string, token: string): boolean {
  const now = Date.now();
  // Check current, previous, and next 30-second windows
  for (let i = -1; i <= 1; i++) {
    const expected = generateTOTP(secret, now + i * 30000);
    if (expected === token) return true;
  }
  return false;
}

export function generateTOTPToken(secret: string): string {
  return generateTOTP(secret, Date.now());
}
