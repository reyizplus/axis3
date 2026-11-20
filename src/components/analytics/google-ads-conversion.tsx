'use client';

import { useEffect, useRef } from 'react';

const COOKIE_CONSENT_KEY = 'axis3-cookie-consent';

interface GoogleAdsConversionProps {
  /** `AW-XXXXXXXX/label` biçiminde dönüşüm hedefi. */
  sendTo: string;
  /** Sipariş tutarı (KDV dahil). Bilinmiyorsa `null` — olay gönderilmez. */
  value: number | null;
  currency?: string;
  /**
   * Sipariş numarası. Google aynı `transaction_id` için dönüşümü bir kez
   * sayar; sayfa yenilense veya kullanıcı geri dönse bile çift sayım olmaz.
   */
  transactionId?: string | null;
}

/**
 * Google Ads dönüşüm olayı ("Sipariş Tamamlandı").
 *
 * Google'ın verdiği etkinlik snippet'inin bileşen hâli:
 * `gtag('event','conversion',{ send_to, value, currency, transaction_id })`
 *
 * Koşullar:
 * - Tutar ve sipariş numarası yüklenmeden gönderilmez (eksik/0 değer dönüşümü
 *   bozar).
 * - Yalnızca çerez onayı verildiyse gönderilir (Consent Mode ile aynı kural).
 * - `transaction_id` başına bir kez gönderilir.
 */
export function GoogleAdsConversion({
  sendTo,
  value,
  currency = 'TRY',
  transactionId,
}: GoogleAdsConversionProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (value == null || !Number.isFinite(value) || value <= 0) return;
    if (typeof window === 'undefined') return;

    const dedupeKey = transactionId ? `axis3_ads_conversion_${transactionId}` : null;
    if (dedupeKey && localStorage.getItem(dedupeKey) === '1') return;

    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      if (dedupeKey) localStorage.setItem(dedupeKey, '1');

      const payload = {
        send_to: sendTo,
        value,
        currency,
        // Google'ın snippet'inde boş string de olabilir; anlamlı bir kimlik
        // varsa geçilir, yoksa alan hiç gönderilmez.
        ...(transactionId ? { transaction_id: transactionId } : {}),
      };

      const win = window as typeof window & {
        gtag?: (...args: unknown[]) => void;
      };

      if (typeof win.gtag === 'function') {
        win.gtag('event', 'conversion', payload);
        return;
      }

      // Etiket henüz yüklenmediyse dataLayer'a itilir; gtag.js geldiğinde işler.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(['event', 'conversion', payload]);
    };

    if (localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted') {
      fire();
      return;
    }

    // Onay henüz verilmediyse banner'daki tercihi bekleriz.
    function onConsentChanged(event: Event) {
      if ((event as CustomEvent).detail === 'accepted') fire();
    }

    window.addEventListener('cookie-consent-changed', onConsentChanged);
    return () => window.removeEventListener('cookie-consent-changed', onConsentChanged);
  }, [sendTo, value, currency, transactionId]);

  return null;
}
