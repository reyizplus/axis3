'use client';

import dynamic from 'next/dynamic';

const ConsoleFilter = dynamic(() => import('@/components/providers/console-filter').then(m => m.ConsoleFilter));
const ActivityTracker = dynamic(() => import('@/components/providers/activity-tracker').then(m => m.ActivityTracker));
const IPActivityTracker = dynamic(() => import('@/components/providers/ip-activity-tracker').then(m => m.IPActivityTracker));
const CookieConsentBanner = dynamic(() => import('@/components/cookie-consent-banner').then(m => m.CookieConsentBanner));

export function ClientProviders() {
  return (
    <>
      <ConsoleFilter />
      <ActivityTracker />
      <IPActivityTracker />
      <CookieConsentBanner />
    </>
  );
}
