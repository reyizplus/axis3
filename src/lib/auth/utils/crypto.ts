import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const DEV_FALLBACK_KEY = 'axis3-dev-encryption-key';
let warnedAboutFallback = false;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key && key.length >= 32) {
    return Buffer.from(key.padEnd(32, 'x').slice(0, 32), 'utf8');
  }

  // Üretimde sessizce zayıf bir anahtara düşmek yok: 2FA parolası bu anahtarla
  // şifreleniyor. Yerelde ise 2FA akışı env kurulumu olmadan da test
  // edilebilsin diye sabit bir geliştirme anahtarı kullanılır.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY environment variable is required (32+ chars)');
  }

  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      '[crypto] ENCRYPTION_KEY is not set; using the insecure development key. ' +
      'Pending 2FA sessions will not survive a change of this value.'
    );
  }

  return Buffer.from(DEV_FALLBACK_KEY.padEnd(32, 'x').slice(0, 32), 'utf8');
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(ciphertext: string): string {
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed');
  }
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateCode(length = 6): string {
  const digits = '0123456789';
  let code = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += digits[bytes[i]! % 10];
  }
  return code;
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(6).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-'));
  }
  return codes;
}
