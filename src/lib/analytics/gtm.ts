/**
 * Google Tag Manager yardımcıları.
 *
 * Kapsayıcı kimliği env'den okunur ve doğrulanır: geçersiz/placeholder bir
 * değer (örn. `GTM-XXXXXXX`) tarayıcının bozuk bir `gtm.js` isteği atmasına
 * yol açar. Kimlik yoksa GTM hiç yüklenmez.
 */
export function getGtmContainerId(): string | undefined {
  const raw = (process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || '')
    .trim()
    .toUpperCase();

  if (!raw) return undefined;
  // GTM kapsayıcı kimliği biçimi: GTM-XXXXXXX
  if (!/^GTM-[A-Z0-9]{4,}$/.test(raw)) return undefined;
  // Dokümanlardaki örnek değer (GTM-XXXXXXX) gerçek bir kapsayıcı değildir.
  if (/^GTM-X+$/.test(raw)) return undefined;

  return raw;
}
