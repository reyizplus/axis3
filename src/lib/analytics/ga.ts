/**
 * Google Analytics yardımcıları.
 *
 * Ölçüm kimliği iki env adıyla da tanımlanabilsin diye (eski kurulumlarda
 * NEXT_PUBLIC_GA_ID kullanılıyordu) tek yerden çözülür. Geçersiz/placeholder
 * değerler (örn. G-XXXXXXXXXX) yok sayılır; aksi halde tarayıcı bozuk bir
 * gtag isteği atmaya çalışır.
 */
export function getGaMeasurementId(): string | undefined {
  const raw = (
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA_ID ||
    ''
  ).trim();

  if (!raw) return undefined;
  // GA4 ölçüm kimliği biçimi: G-XXXXXXXXXX
  if (!/^G-[A-Z0-9]{6,}$/i.test(raw)) return undefined;
  // Örnek/placeholder değerler
  if (/^G-X+$/i.test(raw)) return undefined;

  return raw;
}
