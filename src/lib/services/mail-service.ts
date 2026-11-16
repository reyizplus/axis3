/**
 * Mail Service - Email Notification System
 * Axis3 - Resend Integration with React Email Templates
 *
 * Every public send method funnels through `deliver()`, which
 *   - refuses to send without a recipient,
 *   - sends both HTML and a plain-text alternative,
 *   - records the attempt in `email_logs`.
 */

import { resend as resendClient, EMAIL_CONFIG } from '@/lib/email/client';
import { EmailResult } from '@/lib/email/types';
import { getAppUrl, prepareOrderEmailData, prepareOrderStatusEmailData } from '@/lib/email/templates';
import { render } from '@react-email/components';
import OrderConfirmation from '@/emails/order-confirmation';
import OrderStatusUpdate from '@/emails/order-status-update';
import WelcomeEmail from '@/emails/welcome';
import PasswordResetEmail from '@/emails/password-reset';
import EmailVerification from '@/emails/email-verification';
import ContactNotification from '@/emails/contact-notification';
import { logEmail } from '@/lib/services/email-log-service';
import type { Json } from '@/types/database';

export type VerificationPurpose = 'registration' | '2fa' | 'email_verification';

export interface VerificationCodeOptions {
  userName?: string;
  purpose?: VerificationPurpose;
  /** Displayed in the template; keep it in sync with the stored expiry. */
  expiresInMinutes?: number;
}

interface DeliverInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  emailType: string;
  /**
   * Overrides the global Reply-To. Pass `null` for purely transactional
   * security mail (password reset, verification codes) where replying is
   * meaningless: the header is omitted and answers fall back to From.
   */
  replyTo?: string | null;
  userId?: string | null;
  metadata?: Json;
}

const VERIFICATION_SUBJECTS: Record<VerificationPurpose, string> = {
  registration: 'E-posta Doğrulama Kodu - AXIS3',
  '2fa': 'Giriş Doğrulama Kodu - AXIS3',
  email_verification: 'E-posta Doğrulama Kodu - AXIS3',
};

// =====================================================
// MAIL SERVICE CLASS
// =====================================================

class MailService {
  private warnedNotConfigured = false;

  private notConfigured(context: string): EmailResult {
    if (!this.warnedNotConfigured) {
      this.warnedNotConfigured = true;
      console.warn(
        '[MailService] RESEND_API_KEY tanımlı değil — e-posta gönderimi devre dışı. ' +
        'Sipariş/şifre bildirimleri gönderilmeyecek.'
      );
    }
    console.warn(`[MailService] ${context} skipped: email service not configured`);
    return { success: false, error: 'Email service not configured' };
  }

  /** Render a React Email template to HTML + plain text. */
  private async renderTemplate(node: React.ReactElement): Promise<{ html: string; text: string }> {
    const [html, text] = await Promise.all([
      render(node),
      render(node, { plainText: true }),
    ]);

    return { html, text };
  }

  private async deliver(input: DeliverInput): Promise<EmailResult> {
    const to = (input.to || '').trim();

    if (!to) {
      console.warn(`[MailService] ${input.emailType} skipped: recipient address is empty`);
      await logEmail({
        userId: input.userId,
        recipient: '',
        emailType: input.emailType,
        subject: input.subject,
        status: 'skipped',
        error: 'Alıcı e-posta adresi yok',
        metadata: input.metadata,
      });
      return { success: false, error: 'Alıcı e-posta adresi yok' };
    }

    if (!resendClient) {
      await logEmail({
        userId: input.userId,
        recipient: to,
        emailType: input.emailType,
        subject: input.subject,
        status: 'skipped',
        error: 'Email service not configured',
        metadata: input.metadata,
      });
      return this.notConfigured(input.emailType);
    }

    try {
      const { data, error } = await resendClient.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo:
          input.replyTo === null
            ? undefined
            : input.replyTo || EMAIL_CONFIG.replyTo,
      });

      if (error) {
        console.error(`[MailService] ${input.emailType} failed:`, error);
        await logEmail({
          userId: input.userId,
          recipient: to,
          emailType: input.emailType,
          subject: input.subject,
          status: 'failed',
          error: error.message,
          metadata: input.metadata,
        });
        return { success: false, error: error.message };
      }

      await logEmail({
        userId: input.userId,
        recipient: to,
        emailType: input.emailType,
        subject: input.subject,
        status: 'sent',
        providerId: data?.id,
        metadata: input.metadata,
      });

      return { success: true, messageId: data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email send failed';
      console.error(`[MailService] ${input.emailType} error:`, error);
      await logEmail({
        userId: input.userId,
        recipient: to,
        emailType: input.emailType,
        subject: input.subject,
        status: 'failed',
        error: message,
        metadata: input.metadata,
      });
      return { success: false, error: message };
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: any): Promise<EmailResult> {
    try {
      const emailData = prepareOrderEmailData(order);
      const { html, text } = await this.renderTemplate(OrderConfirmation({ order: emailData }));

      return await this.deliver({
        to: emailData.userEmail,
        subject: `Siparişiniz Alındı - ${emailData.orderNumber}`,
        html,
        text,
        emailType: 'order_confirmation',
        // Order mail: answers must go to noreply, not a shared inbox.
        replyTo: null,
        userId: order?.user_id ?? null,
        metadata: { orderNumber: emailData.orderNumber, orderId: order?.id },
      });
    } catch (error) {
      console.error('[MailService] Order confirmation email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(
    order: any,
    oldStatus: string,
    options: { includeTracking?: boolean } = {}
  ): Promise<EmailResult> {
    try {
      const emailData = prepareOrderStatusEmailData(order, oldStatus, options);
      const { html, text } = await this.renderTemplate(OrderStatusUpdate({ order: emailData }));

      return await this.deliver({
        to: emailData.userEmail,
        subject: `Sipariş Durumu Güncellendi - ${emailData.orderNumber}`,
        html,
        text,
        emailType: 'order_status_update',
        // Order mail: answers must go to noreply, not a shared inbox.
        replyTo: null,
        userId: order?.user_id ?? null,
        metadata: {
          orderNumber: emailData.orderNumber,
          orderId: order?.id,
          newStatus: emailData.newStatus,
        },
      });
    } catch (error) {
      console.error('[MailService] Status update email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    userId?: string
  ): Promise<EmailResult> {
    try {
      const { html, text } = await this.renderTemplate(
        WelcomeEmail({ userName, dashboardUrl: `${getAppUrl()}/dashboard` })
      );

      return await this.deliver({
        to: userEmail,
        subject: 'AXIS3 - Hoş Geldiniz',
        html,
        text,
        emailType: 'welcome',
        userId: userId ?? null,
      });
    } catch (error) {
      console.error('[MailService] Welcome email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail: string, resetUrl: string): Promise<EmailResult> {
    try {
      const { html, text } = await this.renderTemplate(
        PasswordResetEmail({ resetUrl, userEmail })
      );

      return await this.deliver({
        to: userEmail,
        subject: 'AXIS3 - Şifre Sıfırlama Talebi',
        html,
        text,
        emailType: 'password_reset',
        // Security mail: no Reply-To, answers must not land in a shared inbox.
        replyTo: null,
      });
    } catch (error) {
      console.error('[MailService] Password reset email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Notify the shop owner about a new contact form message.
   *
   * The message is already stored in `feedback`; this is only the alert.
   */
  async sendContactNotification(input: {
    name: string;
    email: string;
    phone: string;
    message: string;
    pageUrl?: string;
    subject?: string;
    submittedAt?: string;
  }): Promise<EmailResult> {
    try {
      const to = (process.env.ADMIN_NOTIFICATION_EMAIL || EMAIL_CONFIG.replyTo).trim();
      if (!to) {
        return { success: false, error: 'ADMIN_NOTIFICATION_EMAIL is not configured' };
      }

      const { html, text } = await this.renderTemplate(
        ContactNotification({
          name: input.name,
          email: input.email,
          phone: input.phone,
          subject: input.subject || 'İletişim Formu',
          message: input.message,
          submittedAt: input.submittedAt || new Date().toLocaleString('tr-TR'),
          pageUrl: input.pageUrl,
          appUrl: getAppUrl(),
        })
      );

      return await this.deliver({
        to,
        subject: `İletişim Formu: ${input.name}`,
        html,
        text,
        emailType: 'contact_notification',
        replyTo: input.email,
        metadata: { senderEmail: input.email, pageUrl: input.pageUrl },
      });
    } catch (error) {
      console.error('[MailService] Contact notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Send an e-mailed verification code (registration, 2FA, e-mail verification).
   */
  async sendVerificationCode(
    email: string,
    code: string,
    options: VerificationCodeOptions = {}
  ): Promise<EmailResult> {
    const purpose = options.purpose || 'registration';
    const expiresInMinutes = options.expiresInMinutes ?? 15;

    try {
      const { html, text } = await this.renderTemplate(
        EmailVerification({
          code,
          userName: options.userName || 'Kullanıcı',
          purpose,
          expiresInMinutes,
        })
      );

      return await this.deliver({
        to: email,
        subject: VERIFICATION_SUBJECTS[purpose],
        html,
        text,
        emailType: `verification_${purpose}`,
        // Security mail: no Reply-To, answers must not land in a shared inbox.
        replyTo: null,
        metadata: { purpose, expiresInMinutes },
      });
    } catch (error) {
      console.error('[MailService] Verification code email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }
}

// =====================================================
// EXPORTS
// =====================================================

export const mailService = new MailService();
export { MailService };
