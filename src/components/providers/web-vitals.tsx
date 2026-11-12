'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { getGaMeasurementId } from '@/lib/analytics/ga';

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === 'production') {
      const body = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      };
      const gaId = getGaMeasurementId();
      if (gaId && typeof window !== 'undefined' && 'gtag' in window) {
        window.gtag?.('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_label: metric.id,
          non_interaction: true,
        });
      }
      // Send to custom analytics endpoint
      try {
        navigator.sendBeacon?.('/api/v1/web-vitals', JSON.stringify(body));
      } catch {}
    }
  });

  return null;
}
