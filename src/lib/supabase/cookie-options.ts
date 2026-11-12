import type { CookieOptions } from '@supabase/ssr';

/**
 * Supabase auth çerezleri için tek doğruluk kaynağı.
 *
 * Neden: middleware (proxy) çerezleri `.axis3.com.tr` domain'i ile, Server
 * Component / Route Handler istemcisi ise domain'siz (host-only) yazıyordu.
 * Tarayıcı ikisini ayrı çerez olarak sakladığı için prod'da aynı adlı iki
 * `sb-...-auth-token` oluşabiliyor ve oturum "kaybolmuş" gibi görünüyordu.
 * Artık üç istemci de (browser / server / proxy) aynı seçenekleri kullanır.
 */
export const SUPABASE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 gün (tarayıcı sınırı)

interface CookieContext {
  /** İsteğin host'u (port dahil olabilir), ör. "axis3.com.tr" veya "localhost:3000". */
  hostname?: string | null;
  /** İsteğin protokolü, ör. "https:" veya "https". */
  protocol?: string | null;
  /** Ters proxy başlığı: x-forwarded-proto. */
  forwardedProto?: string | null;
}

/**
 * Çerez domain'ini hesaplar. localhost / IP / port içeren geliştirme
 * adreslerinde `undefined` döner (host-only çerez).
 */
export function getSupabaseCookieDomain(hostname?: string | null): string | undefined {
  if (!hostname) return undefined;

  const host = hostname.trim().toLowerCase().replace(/:\d+$/, '');
  if (!host) return undefined;

  // Geliştirme / yerel adresler
  if (host === 'localhost' || host.endsWith('.localhost')) return undefined;
  if (host === '127.0.0.1' || host === '0.0.0.0' || host === '[::1]' || host === '::1') return undefined;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return undefined;

  // Nokta içermeyen iç ağ host'ları
  if (!host.includes('.')) return undefined;

  // www -> apex (proxy.ts zaten 301 yönlendiriyor, yine de güvenli taraf)
  return '.' + host.replace(/^www\./, '');
}

/**
 * HTTPS bilgisini protokol başlıklarından çıkarır.
 * Protokol bilinmiyorsa: yerel adreslerde (localhost/IP) false, prod'da true.
 * Böylece http üzerinden çalışan yerel prod imajı testi bozulmaz.
 */
function isSecureRequest(context: CookieContext): boolean {
  const forwarded = context.forwardedProto?.split(',')[0]?.trim().toLowerCase();
  const proto = (forwarded || context.protocol || '').toLowerCase().replace(':', '');

  if (proto === 'https') return true;
  if (proto === 'http') return false;

  if (getSupabaseCookieDomain(context.hostname) === undefined) return false;

  return process.env.NODE_ENV === 'production';
}

/**
 * Üç Supabase istemcisi için ortak çerez seçenekleri.
 *
 * - `domain`: prod'da `.axis3.com.tr`, yerelde undefined (host-only)
 * - `secure`: yalnızca HTTPS üzerinde (yerel http prod testi bozulmasın)
 * - `httpOnly: false`: @supabase/ssr tarayıcı istemcisi token'ı okuyabilmeli
 */
export function getSupabaseCookieOptions(context: CookieContext = {}): CookieOptions {
  return {
    domain: getSupabaseCookieDomain(context.hostname),
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: isSecureRequest(context),
    maxAge: SUPABASE_COOKIE_MAX_AGE,
  };
}
