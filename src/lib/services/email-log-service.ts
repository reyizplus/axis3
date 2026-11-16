/**
 * E-mail delivery log (server-only)
 *
 * Best effort on purpose: logging must never make an e-mail send fail.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

export type EmailLogStatus = 'sent' | 'failed' | 'skipped';

export interface EmailLogEntry {
  userId?: string | null;
  recipient: string;
  emailType: string;
  subject: string;
  status: EmailLogStatus;
  providerId?: string | null;
  error?: string | null;
  metadata?: Json;
}

export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.from('email_logs').insert({
      user_id: entry.userId || null,
      recipient: entry.recipient,
      email_type: entry.emailType,
      subject: entry.subject,
      status: entry.status,
      provider_id: entry.providerId || null,
      error: entry.error || null,
      metadata: entry.metadata || {},
    });

    if (error) {
      console.warn('[email-log] Could not write log entry:', error.message);
    }
  } catch (error) {
    console.warn(
      '[email-log] Logging unavailable:',
      error instanceof Error ? error.message : error
    );
  }
}
