'use server';

import { createServiceClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import type { AuthEventType } from '../types';
import { headers } from 'next/headers';

export async function getClientInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    return {
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null,
      userAgent: h.get('user-agent') || null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function logAuthEvent(
  eventType: AuthEventType,
  userId: string | null,
  email: string | null,
  metadata?: Record<string, unknown>,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  try {
    if (ipAddress === undefined && userAgent === undefined) {
      const clientInfo = await getClientInfo();
      ipAddress ??= clientInfo.ip;
      userAgent ??= clientInfo.userAgent;
    }
    const supabase = createServiceClient();
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: `auth:${eventType}`,
      entity_type: 'auth_event',
      entity_id: userId || email || 'unknown',
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      new_values: (metadata || {}) as Json,
    });
  } catch (error) {
    console.error('[Audit] Failed to log auth event:', error);
  }
}
