/**
 * Contact Form Notification Email Template
 * Enterprise-grade professional design for 2026
 * Admin notification for contact form submissions
 */

import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Text,
  Link,
  Preview,
} from '@react-email/components';

interface ContactNotificationProps {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  submittedAt: string;
  pageUrl?: string;
  appUrl: string;
}

export default function ContactNotification({
  name,
  email,
  phone,
  subject,
  message,
  submittedAt,
  pageUrl,
  appUrl,
}: ContactNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>Yeni iletişim mesajı: {name}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>AXIS3</Text>
            <Text style={headerLine}>Yönetici Bildirim Sistemi</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={title}>Yeni İletişim Formu Mesajı</Text>
            
            <Text style={paragraph}>
              Web sitesi iletişim formundan yeni bir mesaj alındı. Lütfen en kısa sürede yanıt veriniz.
            </Text>

            {/* Sender Information */}
            <Section style={senderSection}>
              <Text style={sectionTitle}>GÖNDEREN BİLGİLERİ</Text>
              <Section style={senderBox}>
                <table style={infoTable}>
                  <tbody>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Ad Soyad</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>{name}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>E-posta</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Link href={`mailto:${email}`} style={emailLink}>
                          {email}
                        </Link>
                      </td>
                    </tr>
                    {phone && (
                      <tr>
                        <td style={infoLabelCell}>
                          <Text style={infoLabel}>Telefon</Text>
                        </td>
                        <td style={infoValueCell}>
                          <Link href={`tel:${phone}`} style={phoneLink}>
                            {phone}
                          </Link>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Gönderim Zamanı</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>{submittedAt}</Text>
                      </td>
                    </tr>
                    {pageUrl && (
                      <tr>
                        <td style={infoLabelCell}>
                          <Text style={infoLabel}>Sayfa</Text>
                        </td>
                        <td style={infoValueCell}>
                          <Text style={infoValue}>{pageUrl}</Text>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Section>
            </Section>

            {/* Subject */}
            <Section style={subjectSection}>
              <Text style={sectionTitle}>KONU</Text>
              <Section style={subjectBox}>
                <Text style={subjectText}>{subject}</Text>
              </Section>
            </Section>

            {/* Message Content */}
            <Section style={messageSection}>
              <Text style={sectionTitle}>MESAJ İÇERİĞİ</Text>
              <Section style={messageBox}>
                <Text style={messageText}>{message}</Text>
              </Section>
            </Section>

            {/* Quick Actions */}
            <Section style={actionsSection}>
              <Text style={sectionTitle}>HIZLI İŞLEMLER</Text>
              <table style={actionsTable}>
                <tbody>
                  <tr>
                    <td style={actionCell}>
                      <Link href={`mailto:${email}?subject=Re: ${subject}`} style={actionButton}>
                        E-POSTA GÖNDER
                      </Link>
                    </td>
                  </tr>
                  {phone && (
                    <tr>
                      <td style={actionCell}>
                        <Link href={`tel:${phone}`} style={actionButtonSecondary}>
                          TELEFON ET
                        </Link>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={actionCell}>
                      <Link href={`${appUrl}/dashboard/admin/contacts`} style={actionButtonSecondary}>
                        TÜM MESAJLARI GÖR
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Response Guidelines */}
            <Section style={guidelinesSection}>
              <Text style={guidelinesTitle}>YANIT REHBERİ</Text>
              <Section style={guidelinesBox}>
                <Text style={guidelineText}>
                  Müşteri memnuniyeti için 24 saat içinde yanıt verilmesi önerilir
                </Text>
                <Text style={guidelineText}>
                  Profesyonel ve çözüm odaklı bir yaklaşım benimseyin
                </Text>
                <Text style={guidelineText}>
                  Gerekli teknik bilgi ve dokümantasyonu paylaşın
                </Text>
                <Text style={guidelineText}>
                  İletişim bilgilerinizi ve destek kanallarını belirtin
                </Text>
              </Section>
            </Section>

            <Text style={signature}>
              AXIS3 Bildirim Sistemi
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © 2026 AXIS3 - Endüstriyel 3D Baskı Çözümleri. Tüm hakları saklıdır.
            </Text>
            <Text style={footerText}>
              Bu e-posta otomatik olarak oluşturulmuştur.
            </Text>
            <Text style={footerDivider}>—</Text>
            <Text style={footerLinks}>
              <Link href={`${appUrl}/dashboard/admin`} style={footerLink}>
                Admin Panel
              </Link>
              {' | '}
              <Link href={`${appUrl}/dashboard/admin/contacts`} style={footerLink}>
                Mesajlar
              </Link>
              {' | '}
              <Link href={`${appUrl}/dashboard/admin/settings`} style={footerLink}>
                Ayarlar
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles - Enterprise 2026 Design System
const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
  padding: '40px 20px',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  border: '1px solid #e0e0e0',
};

const header = {
  backgroundColor: '#000000',
  padding: '40px 40px 32px',
  borderBottom: '4px solid #F27022',
};

const logoText = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  letterSpacing: '4px',
  textTransform: 'uppercase' as const,
};

const headerLine = {
  color: '#999999',
  fontSize: '10px',
  fontWeight: '500',
  margin: '0',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
};

const content = {
  padding: '48px 40px',
};

const title = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 32px 0',
  letterSpacing: '-0.5px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#333333',
  margin: '0 0 40px 0',
};

const senderSection = {
  margin: '40px 0',
};

const sectionTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 16px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const senderBox = {
  border: '1px solid #e0e0e0',
  padding: '24px',
  backgroundColor: '#fafafa',
};

const infoTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const infoLabelCell = {
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  width: '35%',
};

const infoValueCell = {
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  textAlign: 'right' as const,
};

const infoLabel = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
  fontWeight: '500',
};

const infoValue = {
  fontSize: '13px',
  color: '#000000',
  margin: '0',
  fontWeight: '600',
};

const emailLink = {
  fontSize: '13px',
  color: '#000000',
  textDecoration: 'underline',
  fontWeight: '600',
};

const phoneLink = {
  fontSize: '13px',
  color: '#000000',
  textDecoration: 'underline',
  fontWeight: '600',
};

const subjectSection = {
  margin: '40px 0',
};

const subjectBox = {
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #F27022',
  padding: '20px',
  backgroundColor: '#fafafa',
};

const subjectText = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#000000',
  margin: '0',
  lineHeight: '1.5',
};

const messageSection = {
  margin: '40px 0',
};

const messageBox = {
  border: '1px solid #e0e0e0',
  padding: '24px',
  backgroundColor: '#ffffff',
  minHeight: '120px',
};

const messageText = {
  fontSize: '14px',
  lineHeight: '1.7',
  color: '#333333',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const actionsSection = {
  margin: '40px 0',
};

const actionsTable = {
  width: '100%',
};

const actionCell = {
  padding: '8px 0',
};

const actionButton = {
  display: 'block',
  backgroundColor: '#F27022',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 24px',
  border: '2px solid #F27022',
  borderRadius: '8px',
  textAlign: 'center' as const,
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
};

const actionButtonSecondary = {
  display: 'block',
  backgroundColor: '#ffffff',
  color: '#F27022',
  fontSize: '12px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 24px',
  border: '2px solid #F27022',
  borderRadius: '8px',
  textAlign: 'center' as const,
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
};

const guidelinesSection = {
  margin: '40px 0',
};

const guidelinesTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 16px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const guidelinesBox = {
  border: '1px solid #e0e0e0',
  padding: '24px',
  backgroundColor: '#fafafa',
};

const guidelineText = {
  fontSize: '13px',
  lineHeight: '1.8',
  color: '#333333',
  margin: '0 0 12px 0',
  paddingLeft: '16px',
  position: 'relative' as const,
};

const signature = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#000000',
  margin: '40px 0',
  fontWeight: '600',
};

const footer = {
  backgroundColor: '#fafafa',
  padding: '32px 40px',
  borderTop: '1px solid #e0e0e0',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#666666',
  margin: '0 0 8px 0',
  lineHeight: '1.5',
};

const footerDivider = {
  fontSize: '12px',
  color: '#cccccc',
  margin: '16px 0',
};

const footerLinks = {
  fontSize: '12px',
  color: '#999999',
  margin: '0',
};

const footerLink = {
  color: '#999999',
  textDecoration: 'underline',
};
