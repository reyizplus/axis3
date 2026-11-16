/**
 * Resend Email Client
 * Axis3 - Email Notification System
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'noreply@axis3.com.tr').trim();
const RESEND_FROM_NAME = (process.env.RESEND_FROM_NAME || 'AXIS3').trim();
// Replies always go to a monitored mailbox, never to the no-reply sender.
const RESEND_REPLY_TO = (
  process.env.RESEND_REPLY_TO ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  'destek@axis3.com.tr'
).trim();

if (!RESEND_API_KEY) {
  console.warn('[Email Client] RESEND_API_KEY is not defined. Email client will be null.');
}

/**
 * Configured Resend client instance
 */
export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Email configuration
 */
export const EMAIL_CONFIG = {
  from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
  replyTo: RESEND_REPLY_TO,
  enabled: !!RESEND_API_KEY,
};
