/**
 * Resend Email Client
 * Axis3 - Email Notification System
 * 
 * This module provides a configured Resend client instance
 * and exports email configuration constants.
 */

import { Resend } from 'resend';

// Validate environment variables (optional for development)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'noreply@axis3.com.tr').trim();
const RESEND_FROM_NAME = (process.env.RESEND_FROM_NAME || 'AXIS3').trim();

if (!RESEND_API_KEY && process.env.NODE_ENV === 'production') {
  console.warn('[Email] RESEND_API_KEY is not defined. Email notifications will be disabled.');
}

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
  replyTo: 'destek@axis3.com.tr',
  enabled: !!RESEND_API_KEY,
};

/**
 * Check if email service is enabled
 */
export function isEmailEnabled(): boolean {
  return EMAIL_CONFIG.enabled;
}
