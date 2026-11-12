'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getGaMeasurementId } from '@/lib/analytics/ga';

const COOKIE_CONSENT_KEY = 'axis3-cookie-consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  const gaId = getGaMeasurementId();
  // GA yalnızca çerez onayı verildikten sonra yüklenir; onaydan önce hiçbir
  // gtag isteği gitmez ve _ga/_gid çerezi oluşmaz.
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

  if (!gaId || !consented) return null;

  return (
    <>
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
          });
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
