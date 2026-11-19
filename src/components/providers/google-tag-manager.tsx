'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getGtmContainerId } from '@/lib/analytics/gtm';

const COOKIE_CONSENT_KEY = 'axis3-cookie-consent';

/**
 * Google Tag Manager kapsayıcısı.
 *
 * Google'ın verdiği snippet `<head>` içine koşulsuz eklenir; biz ise çerez
 * onayı verilene kadar hiçbir istek atmıyoruz (KVKK). Bu, projedeki Google
 * Analytics kurulumuyla aynı davranıştır. Next.js belgeleri de tag manager
 * için `afterInteractive` stratejisini öneriyor.
 *
 * Kapsayıcı içindeki Google Ads / Analytics etiketleri Tag Manager panelinden
 * yönetilir; kod tarafında ek bir şey yapmak gerekmez.
 */
export function GoogleTagManager() {
  const containerId = getGtmContainerId();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const readConsent = () => {
      setConsented(localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted');
    };

    readConsent();

    function onConsentChanged(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (detail === 'accepted') setConsented(true);
      else if (detail === 'declined') setConsented(false);
    }

    window.addEventListener('cookie-consent-changed', onConsentChanged);
    return () => window.removeEventListener('cookie-consent-changed', onConsentChanged);
  }, []);

  if (!containerId || !consented) return null;

  return (
    <Script id="google-tag-manager" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');
      `}
    </Script>
  );
}
