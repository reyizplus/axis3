import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_HEX = process.env.PENDING_2FA_ENCRYPTION_KEY;

function getKey(): Buffer {
  if (KEY_HEX) {
    return Buffer.from(KEY_HEX, 'hex');
  }
  // Fallback: derive from a known secret (better than nothing)
  const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-dev-key-change-in-production';
  return Buffer.from(SECRET.padEnd(64, 'x').slice(0, 64), 'hex');
}

export function encryptPassword(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptPassword(ciphertext: string): string {
  try {
    const key = getKey();
    const parts = ciphertext.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Failed to decrypt password');
  }
}
