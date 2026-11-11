/**
 * Welcome Email Template
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
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
}

export default function WelcomeEmail({ userName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>AXIS3</Text>
            <Text style={headerLine}>Profesyonel 3D Baskı Platformu</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={title}>Hoş Geldiniz</Text>
            
            <Text style={greeting}>
              Sayın {userName},
            </Text>

            <Text style={paragraph}>
              AXIS3 platformuna katıldığınız için teşekkür ederiz. Endüstriyel üretim çözümlerimiz ile işletmenizin dijital dönüşüm sürecine katkı sağlamaktan memnuniyet duyarız.
            </Text>

            {/* Platform Overview */}
            <Section style={overviewSection}>
              <Text style={sectionTitle}>PLATFORM ÖZELLİKLERİ</Text>
              <Section style={featureBox}>
                <table style={featureTable}>
                  <tbody>
                    <tr>
                      <td style={featureLabelCell}>
                        <Text style={featureLabel}>3D Baskı Hizmetleri</Text>
                      </td>
                      <td style={featureValueCell}>
                        <Text style={featureValue}>Profesyonel üretim altyapısı</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={featureLabelCell}>
                        <Text style={featureLabel}>Anlık Fiyatlandırma</Text>
                      </td>
                      <td style={featureValueCell}>
                        <Text style={featureValue}>Otomatik maliyet hesaplama</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={featureLabelCell}>
                        <Text style={featureLabel}>Sipariş Takibi</Text>
                      </td>
                      <td style={featureValueCell}>
                        <Text style={featureValue}>Gerçek zamanlı durum güncellemeleri</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={featureLabelCell}>
                        <Text style={featureLabel}>Teknik Destek</Text>
                      </td>
                      <td style={featureValueCell}>
                        <Text style={featureValue}>7/24 uzman desteği</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            </Section>

            {/* Getting Started */}
            <Section style={stepsSection}>
              <Text style={sectionTitle}>BAŞLANGIÇ REHBERİ</Text>
              <table style={stepsTable}>
                <tbody>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>01</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Hesap Ayarları</Text>
                      <Text style={stepDesc}>
                        Profil bilgilerinizi tamamlayın ve şirket bilgilerinizi güncelleyin
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>02</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Dosya Yükleme</Text>
                      <Text style={stepDesc}>
                        STL formatında 3D modellerinizi sisteme yükleyin
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>03</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Malzeme Seçimi</Text>
                      <Text style={stepDesc}>
                        Projenize uygun malzeme ve kalite ayarlarını belirleyin
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>04</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Sipariş Oluşturma</Text>
                      <Text style={stepDesc}>
                        Otomatik fiyatlandırma ile siparişinizi tamamlayın
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* CTA */}
            <Section style={ctaSection}>
              <Link href="https://axis3.com.tr/dashboard" style={ctaButton}>
                PLATFORMU KEŞFET
              </Link>
            </Section>

            {/* Support Information */}
            <Section style={supportSection}>
              <Text style={supportTitle}>DESTEK VE İLETİŞİM</Text>
              <Section style={supportBox}>
                <table style={supportTable}>
                  <tbody>
                    <tr>
                      <td style={supportLabelCell}>
                        <Text style={supportLabel}>E-posta</Text>
                      </td>
                      <td style={supportValueCell}>
                        <Text style={supportValue}>destek@axis3.com.tr</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={supportLabelCell}>
                        <Text style={supportLabel}>Telefon</Text>
                      </td>
                      <td style={supportValueCell}>
                        <Text style={supportValue}>+90 501 045 27 78</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={supportLabelCell}>
                        <Text style={supportLabel}>Çalışma Saatleri</Text>
                      </td>
                      <td style={supportValueCell}>
                        <Text style={supportValue}>Hafta içi 09:00 - 18:00</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            </Section>

            <Text style={closing}>
              Başarılı projeler dileriz,
            </Text>
            <Text style={signature}>
              AXIS3 Ekibi
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

const overviewSection = {
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

const featureBox = {
  border: '1px solid #e0e0e0',
  padding: '24px',
  backgroundColor: '#fafafa',
};

const featureTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const featureLabelCell = {
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  width: '45%',
};

const featureValueCell = {
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  textAlign: 'right' as const,
};

const featureLabel = {
  fontSize: '13px',
  color: '#000000',
  margin: '0',
  fontWeight: '600',
};

const featureValue = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
};

const stepsSection = {
  margin: '40px 0',
};

const stepsTable = {
  width: '100%',
};

const stepNumberCell = {
  width: '60px',
  verticalAlign: 'top' as const,
  paddingBottom: '24px',
};

const stepContentCell = {
  verticalAlign: 'top' as const,
  paddingBottom: '24px',
  paddingLeft: '16px',
};

const stepNumber = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#000000',
  margin: '0',
  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
};

const stepTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 4px 0',
};

const stepDesc = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#666666',
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

const supportSection = {
  margin: '40px 0',
};

const supportTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 16px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const supportBox = {
  border: '1px solid #e0e0e0',
  padding: '24px',
  backgroundColor: '#fafafa',
};

const supportTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const supportLabelCell = {
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  width: '40%',
};

const supportValueCell = {
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  textAlign: 'right' as const,
};

const supportLabel = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
  fontWeight: '500',
};

const supportValue = {
  fontSize: '13px',
  color: '#000000',
  margin: '0',
  fontWeight: '600',
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
