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

/**
 * Dönüşüm olayının `send_to` değeri: `AW-XXXXXXXX/label`.
 *
 * Etiket (label) dönüşüm aksiyonuna özeldir; Google Ads panelinde dönüşüm
 * oluşturulunca verilir. Kimlik veya etiket yoksa dönüşüm gönderilmez.
 */
export function getGoogleAdsConversionSendTo(): string | undefined {
  const id = getGoogleAdsId();
  if (!id) return undefined;

  const label = (process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || '').trim();
  // Örnek etiket: j_t-CNzh_LsdEN292p1F (harf, rakam, - ve _)
  if (!/^[A-Za-z0-9_-]{6,}$/.test(label)) return undefined;

  return `${id}/${label}`;
}
