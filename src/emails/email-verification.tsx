/**
 * Email Verification Template
 * Enterprise-grade professional design for 2026
 * Minimalist, clean, corporate aesthetic
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Preview,
} from '@react-email/components';

type VerificationPurpose = 'registration' | '2fa' | 'email_verification';

interface EmailVerificationProps {
  code: string;
  userName: string;
  purpose?: VerificationPurpose;
  expiresInMinutes?: number;
}

export default function EmailVerification({
  code = '123456',
  userName = 'Kullanıcı',
  purpose = 'registration',
  expiresInMinutes = 15,
}: EmailVerificationProps) {
  const isLogin = purpose === '2fa';

  const heading = isLogin ? 'Giriş Doğrulama' : 'E-posta Doğrulama';

  const intro = isLogin
    ? 'AXIS3 hesabınıza giriş yapmak için aşağıdaki doğrulama kodunu kullanmanız gerekmektedir.'
    : purpose === 'email_verification'
      ? 'AXIS3 hesabınızın e-posta adresini doğrulamak için aşağıdaki kodu kullanmanız gerekmektedir.'
      : 'AXIS3 platformuna kaydınızı tamamlamak için aşağıdaki doğrulama kodunu kullanmanız gerekmektedir.';

  const stepTarget = isLogin
    ? 'Giriş doğrulama ekranındaki alana gidin'
    : purpose === 'email_verification'
      ? 'E-posta doğrulama sayfasındaki alana gidin'
      : 'Kayıt sayfasındaki doğrulama alanına gidin';

  return (
    <Html>
      <Head />
      <Preview>{`AXIS3 doğrulama kodunuz: ${code}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>AXIS3</Text>
            <Text style={headerLine}>Profesyonel 3D Baskı Platformu</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={title}>{heading}</Text>
            
            <Text style={greeting}>
              Sayın {userName},
            </Text>

            <Text style={paragraph}>
              {intro}
            </Text>

            {/* Verification Code */}
            <Section style={codeSection}>
              <Text style={codeLabel}>DOĞRULAMA KODU</Text>
              <Section style={codeBox}>
                <Text style={codeText}>{code}</Text>
              </Section>
              <Text style={codeNote}>
                Bu kod {expiresInMinutes} dakika süreyle geçerlidir.
              </Text>
            </Section>

            {/* Security Information */}
            <Section style={infoSection}>
              <Text style={infoTitle}>GÜVENLİK BİLGİLENDİRMESİ</Text>
              <Section style={infoBox}>
                <table style={infoTable}>
                  <tbody>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Geçerlilik Süresi</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>{expiresInMinutes} dakika</Text>
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
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Güvenlik</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>Bu kodu kimseyle paylaşmayın</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            </Section>

            {/* Instructions */}
            <Section style={instructionsSection}>
              <Text style={instructionsTitle}>DOĞRULAMA ADIMLARI</Text>
              <table style={stepsTable}>
                <tbody>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>01</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepText}>
                        {stepTarget}
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>02</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepText}>Yukarıdaki 6 haneli kodu girin</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>03</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepText}>Doğrula butonuna tıklayarak işlemi tamamlayın</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Warning */}
            <Section style={warningSection}>
              <Text style={warningText}>
                Bu doğrulama talebini siz yapmadıysanız, bu e-postayı dikkate almayınız. Hesabınızın güvenliği için şifrenizi değiştirmenizi öneririz.
              </Text>
            </Section>

            <Text style={closing}>
              Saygılarımızla,
            </Text>
            <Text style={signature}>
              Axis3 Güvenlik Ekibi
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
  margin: '0 0 32px 0',
};

const codeSection = {
  textAlign: 'center' as const,
  margin: '40px 0',
};

const codeLabel = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#666666',
  margin: '0 0 16px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const codeBox = {
  backgroundColor: '#000000',
  padding: '24px',
  margin: '0 auto 16px',
  maxWidth: '280px',
  border: '2px solid #F27022',
};

const codeText = {
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '8px',
  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
};

const codeNote = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
};

const infoSection = {
  margin: '40px 0',
};

const infoTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 16px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const infoBox = {
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
  width: '40%',
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

const instructionsTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 24px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
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

const warningSection = {
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #F27022',
  padding: '20px',
  margin: '40px 0',
};

const warningText = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0',
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
