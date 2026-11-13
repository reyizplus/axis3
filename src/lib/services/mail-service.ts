/**
 * Mail Service - Email Notification System
 * Axis3 - Resend Integration with React Email Templates
 * 
 * Purpose: Send transactional emails using Resend and React Email templates
 */

import { resend as resendClient, EMAIL_CONFIG } from '@/lib/email/client';
import { EmailResult } from '@/lib/email/types';
import { prepareOrderEmailData, prepareOrderStatusEmailData } from '@/lib/email/templates';
import { render } from '@react-email/components';
import OrderConfirmation from '@/emails/order-confirmation';
import OrderStatusUpdate from '@/emails/order-status-update';
import WelcomeEmail from '@/emails/welcome';
import PasswordResetEmail from '@/emails/password-reset';

// =====================================================
// MAIL SERVICE CLASS
// =====================================================

class MailService {
  private warnedNotConfigured = false;

  /**
   * Log (once) and report that email delivery is disabled because the Resend
   * client was not created. Previously this returned silently and callers kept
   * assuming the email had been sent.
   */
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

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: any): Promise<EmailResult> {
    try {
      if (!resendClient) {
        return this.notConfigured('Order confirmation email');
      }

      const emailData = prepareOrderEmailData(order);
      const emailHtml = await render(OrderConfirmation({ order: emailData }));
      const { data, error } = await resendClient.emails.send({
        from: EMAIL_CONFIG.from,
        to: emailData.userEmail,
        subject: `Siparişiniz Alındı - ${emailData.orderNumber}`,
        html: emailHtml,
        replyTo: EMAIL_CONFIG.replyTo,
      });

      if (error) {
        console.error('[MailService] Order confirmation email failed:', error);
        return {
          success: false,
          error: error.message,
        };
      }

            return {
        success: true,
        messageId: data?.id,
      };
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
  async sendOrderStatusUpdate(order: any, oldStatus: string): Promise<EmailResult> {
    try {
      if (!resendClient) {
        return this.notConfigured('Order status email');
      }

      const emailData = prepareOrderStatusEmailData(order, oldStatus);
      const emailHtml = await render(OrderStatusUpdate({ order: emailData }));
      const { data, error } = await resendClient.emails.send({
        from: EMAIL_CONFIG.from,
        to: emailData.userEmail,
        subject: `Sipariş Durumu Güncellendi - ${emailData.orderNumber}`,
        html: emailHtml,
        replyTo: EMAIL_CONFIG.replyTo,
      });

      if (error) {
        console.error('[MailService] Status update email failed:', error);
        return {
          success: false,
          error: error.message,
        };
      }

            return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      console.error('[MailService] Status update email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Send welcome email (optional - for future use)
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<EmailResult> {
    try {
      if (!resendClient) {
        return this.notConfigured('Welcome email');
      }

      const emailHtml = await render(WelcomeEmail({ userName }));
      const { data, error } = await resendClient.emails.send({
        from: EMAIL_CONFIG.from,
        to: userEmail,
        subject: 'AXIS3 - Hoş Geldiniz',
        html: emailHtml,
        replyTo: EMAIL_CONFIG.replyTo,
      });

      if (error) {
        console.error('[MailService] Welcome email failed:', error);
        return { success: false, error: error.message };
      }

            return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('[MailService] Welcome email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Send password reset email (optional - for future use)
   */
  async sendPasswordResetEmail(userEmail: string, resetUrl: string): Promise<EmailResult> {
    try {
      if (!resendClient) {
        return this.notConfigured('Password reset email');
      }

      const emailHtml = await render(PasswordResetEmail({ resetUrl, userEmail }));
      const { data, error } = await resendClient.emails.send({
        from: EMAIL_CONFIG.from,
        to: userEmail,
        subject: 'AXIS3 - Şifre Sıfırlama Talebi',
        html: emailHtml,
        replyTo: EMAIL_CONFIG.replyTo,
      });

      if (error) {
        console.error('[MailService] Password reset email failed:', error);
        return { success: false, error: error.message };
      }

            return { success: true, messageId: data?.id };
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
   * The message is already stored in `feedback`; this is only the alert. It is
   * deliberately independent from the store (no template) so it keeps working
   * even if the feedback table exists but nobody watches it.
   */
  async sendContactNotification(input: {
    name: string;
    email: string;
    phone: string;
    message: string;
    pageUrl?: string;
  }): Promise<EmailResult> {
    try {
      if (!resendClient) {
        return this.notConfigured('Contact form notification');
      }

      const to = (process.env.ADMIN_NOTIFICATION_EMAIL || EMAIL_CONFIG.replyTo).trim();
      if (!to) {
        return { success: false, error: 'ADMIN_NOTIFICATION_EMAIL is not configured' };
      }

      const escape = (value: string) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const html = `
        <h2>Yeni İletişim Formu Mesajı</h2>
        <p><strong>Ad:</strong> ${escape(input.name)}</p>
        <p><strong>E-posta:</strong> ${escape(input.email)}</p>
        <p><strong>Telefon:</strong> ${escape(input.phone)}</p>
        ${input.pageUrl ? `<p><strong>Sayfa:</strong> ${escape(input.pageUrl)}</p>` : ''}
        <hr />
        <p style="white-space:pre-wrap">${escape(input.message)}</p>
      `;

      const { data, error } = await resendClient.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        replyTo: input.email,
        subject: `İletişim Formu: ${input.name}`,
        html,
      });

      if (error) {
        console.error('[MailService] Contact notification failed:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('[MailService] Contact notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Send Email Verification Code
   */
  async sendVerificationCode(
    email: string,
    code: string,
    userName?: string
  ): Promise<EmailResult> {
    if (!resendClient) {
      return this.notConfigured('Verification code email');
    }

    try {
      const EmailVerification = (await import('@/emails/email-verification')).default;
      const { data, error } = await resendClient.emails.send({
        from: EMAIL_CONFIG.from,
        to: email,
        subject: 'Email Doğrulama - AXIS3',
        react: EmailVerification({
          code,
          userName: userName || 'Kullanıcı',
        }),
      });

      if (error) {
        console.error('[MailService] Verification code email failed:', error);
        return { success: false, error: error.message };
      }

            return { success: true, messageId: data?.id };
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
