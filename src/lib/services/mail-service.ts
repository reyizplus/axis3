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
  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: any): Promise<EmailResult> {
    try {
      if (!resendClient) {
        return { success: false, error: 'Email service not configured' };
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
        return { success: false, error: 'Email service not configured' };
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
        return { success: false, error: 'Email service not configured' };
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
        return { success: false, error: 'Email service not configured' };
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
   * Send Email Verification Code
   */
  async sendVerificationCode(
    email: string,
    code: string,
    userName?: string
  ): Promise<EmailResult> {
    if (!resendClient) {
      return { success: false, error: 'Email service not configured' };
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
