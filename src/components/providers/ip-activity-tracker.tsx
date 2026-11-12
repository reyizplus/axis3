'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function IPActivityTracker() {
  const pathname = usePathname();
  const lastPath = useRef('');

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const excluded = ['/api/', '/_next/', '/favicon.ico'];
    if (excluded.some(p => pathname.startsWith(p))) return;

    try {
      // Goreli URL: ayni origin. Mutlak URL CSP/www-apex farkinda bloke oluyordu.
      fetch('/api/internal/ip-activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: null,
          user_id: null,
          user_email: '',
          user_name: '',
          page_url: pathname,
          user_agent: navigator.userAgent,
          device_type: 'unknown',
        }),
      });
    } catch {
      // non-critical
    }
  }, [pathname]);

  return null;
}
