'use client';

import { useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'axis3-cookie-consent';

type ConsentState = {
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  analytics_storage: 'granted' | 'denied';
};

function buildConsent(granted: boolean): ConsentState {
  const value = granted ? 'granted' : 'denied';
  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  };
}

/**
 * Google Consent Mode v2 köprüsü.
 *
 * Google etiketi ilk HTML'de `denied` varsayılanıyla yükleniyor (bkz.
 * `GoogleAdsTag`). Bu bileşen, çerez banner'ındaki tercihi Google'a bildirir:
 * "Kabul Et" → `consent/update granted`, "Reddet" → `denied` kalır.
 *
 * `gtag` henüz tanımlı değilse (Google etiketi kapalıysa) doğrudan
 * `dataLayer`'a itilir; Google etiketi sonradan yüklense de sinyali görür.
 */
export function GoogleConsentMode() {
  useEffect(() => {
    function push(granted: boolean) {
      if (typeof window === 'undefined') return;

      const state = buildConsent(granted);
      const win = window as typeof window & {
        gtag?: (...args: unknown[]) => void;
      };

      if (typeof win.gtag === 'function') {
        win.gtag('consent', 'update', state);
        if (granted) win.gtag('consent', 'update', { ads_data_redaction: false });
        return;
      }

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(['consent', 'update', state]);
    }

    function applySavedConsent() {
      push(localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted');
    }

    applySavedConsent();

    function onConsentChanged(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (detail === 'accepted') push(true);
      else if (detail === 'declined') push(false);
    }

    window.addEventListener('cookie-consent-changed', onConsentChanged);
    return () => window.removeEventListener('cookie-consent-changed', onConsentChanged);
  }, []);

  return null;
}
