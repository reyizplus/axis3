'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { logUserActivity } from '@/lib/services/activity-service';

export function ActivityTracker() {
  const pathname = usePathname();
  const { user } = useAuth();
  const lastPath = useRef('');

  useEffect(() => {
    if (!user || pathname === lastPath.current) return;
    lastPath.current = pathname;

    logUserActivity({
      userId: user.id,
      userEmail: user.email || undefined,
      userName: user.user_metadata?.full_name || undefined,
      ipAddress: null,
      userAgent: navigator.userAgent,
      pageUrl: pathname,
    });
  }, [pathname, user]);

  return null;
}
