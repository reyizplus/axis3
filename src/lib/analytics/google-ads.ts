/**
 * Google Ads (gtag.js) yardımcıları.
 *
 * Google Ads dönüşüm etiketi `AW-` ile başlayan bir kimlik kullanır. Kimlik
 * env'den okunur; boş/geçersiz değerde etiket hiç basılmaz (aksi halde
 * tarayıcı `gtag/js?id=` isteğini 404 ile açar).
 *
 * Not: `AW-` kimliği herkese açıktır (sayfa kaynağında görünür), gizli değildir.
 */
export function getGoogleAdsId(): string | undefined {
  const raw = (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '')
    .trim()
    .toUpperCase();

  if (!raw) return undefined;
  // Google Ads dönüşüm kimliği biçimi: AW- + rakamlar
  if (!/^AW-\d{6,}$/.test(raw)) return undefined;

  return raw;
}
