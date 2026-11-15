'use client';

import dynamic from 'next/dynamic';

const ConsoleFilter = dynamic(() => import('@/components/providers/console-filter').then(m => m.ConsoleFilter));
const CookieConsentBanner = dynamic(() => import('@/components/cookie-consent-banner').then(m => m.CookieConsentBanner));

export function ClientProviders() {
  return (
    <>
      <ConsoleFilter />
      <CookieConsentBanner />
    </>
  );
}
