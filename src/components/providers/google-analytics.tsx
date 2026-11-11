'use client';

import Script from 'next/script';
import { useCallback, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'axis3-cookie-consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  const applyConsent = useCallback(() => {
    const consent = typeof window !== 'undefined' ? localStorage.getItem(COOKIE_CONSENT_KEY) : null;
    if (consent === 'accepted') {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
      });
    }
  }, []);

  useEffect(() => {
    function onConsentChanged(e: CustomEvent) {
      const consent = e.detail;
      if (consent === 'accepted') {
        window.gtag?.('consent', 'update', {
          analytics_storage: 'granted',
        });
      }
    }

    window.addEventListener('cookie-consent-changed', onConsentChanged as EventListener);
    return () => window.removeEventListener('cookie-consent-changed', onConsentChanged as EventListener);
  }, []);

  if (!gaId) return null;

  return (
    <>
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        onLoad={applyConsent}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500,
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
