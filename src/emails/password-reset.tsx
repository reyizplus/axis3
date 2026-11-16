/**
 * Password Reset Email Template
 * Enterprise-grade professional design for 2026
 * Minimalist, clean, corporate aesthetic
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

interface PasswordResetEmailProps {
  resetUrl: string;
  userEmail: string;
}

export default function PasswordResetEmail({ resetUrl, userEmail }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>AXIS3 şifre sıfırlama bağlantınız</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>AXIS3</Text>
            <Text style={headerLine}>Profesyonel 3D Baskı Platformu</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={title}>Şifre Sıfırlama Talebi</Text>
            
            <Text style={greeting}>
              Güvenlik Bildirimi
            </Text>

            <Text style={paragraph}>
              Hesabınız için bir şifre sıfırlama talebi alındı. Bu talebi siz yapmadıysanız, bu e-postayı dikkate almayınız ve hesap güvenliğiniz için bizimle iletişime geçiniz.
            </Text>

            {/* Security Information */}
            <Section style={securitySection}>
              <Text style={sectionTitle}>GÜVENLİK BİLGİLERİ</Text>
              <Section style={securityBox}>
                <table style={infoTable}>
                  <tbody>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Hesap</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>{userEmail}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Talep Zamanı</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>{new Date().toLocaleString('tr-TR')}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Geçerlilik</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>1 saat</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Kullanım</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>Tek kullanımlık</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            </Section>

            {/* Reset Instructions */}
            <Section style={instructionsSection}>
              <Text style={sectionTitle}>SIFIRLAMA ADIMLARI</Text>
              <table style={stepsTable}>
                <tbody>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>01</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepText}>
                        Aşağıdaki butona tıklayarak şifre sıfırlama sayfasına gidin
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>02</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepText}>
                        Yeni şifrenizi belirleyin ve güvenlik gereksinimlerini karşıladığından emin olun
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>03</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepText}>
                        Şifrenizi onaylayın ve değişikliği kaydedin
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* CTA Button */}
            <Section style={ctaSection}>
              <Link href={resetUrl} style={ctaButton}>
                ŞİFREYİ SIFIRLA
              </Link>
            </Section>

            {/* Alternative Link */}
            <Section style={linkSection}>
              <Text style={linkLabel}>Buton çalışmıyorsa aşağıdaki bağlantıyı kopyalayın:</Text>
              <Section style={linkBox}>
                <Text style={linkText}>{resetUrl}</Text>
              </Section>
            </Section>

            {/* Security Warning */}
            <Section style={warningSection}>
              <Text style={warningTitle}>ÖNEMLİ GÜVENLİK UYARISI</Text>
              <Text style={warningText}>
                Bu şifre sıfırlama bağlantısı 1 saat süreyle geçerlidir ve yalnızca bir kez kullanılabilir. Bağlantıyı kimseyle paylaşmayınız. AXIS3 hiçbir zaman e-posta, telefon veya SMS yoluyla şifrenizi sormaz.
              </Text>
            </Section>

            {/* Password Requirements */}
            <Section style={requirementsSection}>
              <Text style={requirementsTitle}>ŞİFRE GEREKSİNİMLERİ</Text>
              <Section style={requirementsBox}>
                <Text style={requirementText}>Minimum 8 karakter uzunluğunda</Text>
                <Text style={requirementText}>En az bir büyük harf içermeli</Text>
                <Text style={requirementText}>En az bir küçük harf içermeli</Text>
                <Text style={requirementText}>En az bir rakam içermeli</Text>
                <Text style={requirementText}>Özel karakter kullanımı önerilir</Text>
              </Section>
            </Section>

            <Text style={closing}>
              Hesap güvenliğiniz bizim için önemlidir,
            </Text>
            <Text style={signature}>
              AXIS3 Güvenlik Ekibi
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © 2026 AXIS3 - Endüstriyel 3D Baskı Çözümleri. Tüm hakları saklıdır.
            </Text>
            <Text style={footerText}>
              Bu e-posta otomatik olarak oluşturulmuştur. Lütfen yanıtlamayınız.
            </Text>
            <Text style={footerDivider}>—</Text>
            <Text style={footerLinks}>
              axis3.com.tr | destek@axis3.com.tr | +90 501 045 27 78
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

const greeting = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#000000',
  margin: '0 0 16px 0',
  fontWeight: '500',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#333333',
  margin: '0 0 40px 0',
};

const securitySection = {
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

const securityBox = {
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #F27022',
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

const instructionsSection = {
  margin: '40px 0',
};

const stepsTable = {
  width: '100%',
};

const stepNumberCell = {
  width: '60px',
  verticalAlign: 'top' as const,
  paddingBottom: '20px',
};

const stepContentCell = {
  verticalAlign: 'top' as const,
  paddingBottom: '20px',
  paddingLeft: '16px',
};

const stepNumber = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#000000',
  margin: '0',
  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
};

const stepText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '48px 0',
};

const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#F27022',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '16px 48px',
  borderRadius: '8px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
};

const linkSection = {
  margin: '40px 0',
};

const linkLabel = {
  fontSize: '12px',
  color: '#666666',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const linkBox = {
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  padding: '16px',
  wordBreak: 'break-all' as const,
};

const linkText = {
  fontSize: '11px',
  color: '#333333',
  margin: '0',
  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  lineHeight: '1.6',
};

const warningSection = {
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #F27022',
  padding: '24px',
  margin: '40px 0',
};

const warningTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 12px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const warningText = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0',
};

const requirementsSection = {
  margin: '40px 0',
};

const requirementsTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 16px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const requirementsBox = {
  border: '1px solid #e0e0e0',
  padding: '24px',
  backgroundColor: '#fafafa',
};

const requirementText = {
  fontSize: '13px',
  lineHeight: '1.8',
  color: '#333333',
  margin: '0 0 8px 0',
  paddingLeft: '16px',
  position: 'relative' as const,
};

const closing = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '40px 0 8px 0',
};

const signature = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#000000',
  margin: '0 0 40px 0',
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
