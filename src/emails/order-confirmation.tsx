/**
 * Order Confirmation Email Template
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

interface OrderConfirmationProps {
  order: {
    orderNumber: string;
    totalPrice: number;
    discountAmount: number;
    couponCode?: string | null;
    items: Array<{
      fileName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    deliveryAddress?: string;
    estimatedDeliveryDate?: string;
  };
}

export default function OrderConfirmation({ order }: OrderConfirmationProps) {
  const formattedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalPrice);
  const formattedDiscount = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.discountAmount ?? 0);
  const hasDiscount = (order.discountAmount ?? 0) > 0;

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
            <Text style={title}>Sipariş Onayı</Text>
            
            <Text style={paragraph}>
              Siparişiniz başarıyla alınmıştır ve üretim sürecine dahil edilmiştir. Aşağıda sipariş detaylarınızı bulabilirsiniz.
            </Text>

            {/* Order Summary */}
            <Section style={summarySection}>
              <Text style={sectionTitle}>SİPARİŞ BİLGİLERİ</Text>
              <Section style={summaryBox}>
                <table style={summaryTable}>
                  <tbody>
                    <tr>
                      <td style={summaryLabelCell}>
                        <Text style={summaryLabel}>Sipariş Numarası</Text>
                      </td>
                      <td style={summaryValueCell}>
                        <Text style={summaryValue}>{order.orderNumber}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={summaryLabelCell}>
                        <Text style={summaryLabel}>Sipariş Tarihi</Text>
                      </td>
                      <td style={summaryValueCell}>
                        <Text style={summaryValue}>{new Date().toLocaleDateString('tr-TR')}</Text>
                      </td>
                    </tr>
                    {order.estimatedDeliveryDate && (
                      <tr>
                        <td style={summaryLabelCell}>
                          <Text style={summaryLabel}>Tahmini Teslimat</Text>
                        </td>
                        <td style={summaryValueCell}>
                          <Text style={summaryValue}>{order.estimatedDeliveryDate}</Text>
                        </td>
                      </tr>
                    )}
                    {hasDiscount && (
                      <tr>
                        <td style={summaryLabelCell}>
                          <Text style={summaryLabel}>
                            İndirim{order.couponCode ? ` (${order.couponCode})` : ''}
                          </Text>
                        </td>
                        <td style={summaryValueCell}>
                          <Text style={summaryDiscountValue}>-{formattedDiscount}</Text>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={summaryLabelCell}>
                        <Text style={summaryLabelBold}>Toplam Tutar</Text>
                      </td>
                      <td style={summaryValueCell}>
                        <Text style={summaryValueBold}>{formattedTotal}</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            </Section>

            {/* Order Items */}
            <Section style={itemsSection}>
              <Text style={sectionTitle}>SİPARİŞ İÇERİĞİ</Text>
              {order.items.map((item, index) => {
                const itemTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.totalPrice);
                const unitPrice = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.unitPrice);
                
                return (
                  <Section key={index} style={itemBox}>
                    <table style={itemTable}>
                      <tbody>
                        <tr>
                          <td style={itemNameCell}>
                            <Text style={itemName}>{item.fileName}</Text>
                            <Text style={itemDetails}>
                              {item.quantity} adet × {unitPrice}
                            </Text>
                          </td>
                          <td style={itemPriceCell}>
                            <Text style={itemPrice}>{itemTotal}</Text>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Section>
                );
              })}
            </Section>

            {/* Delivery Address */}
            {order.deliveryAddress && order.deliveryAddress !== 'Belirtilmedi' && (
              <Section style={addressSection}>
                <Text style={sectionTitle}>TESLİMAT ADRESİ</Text>
                <Section style={addressBox}>
                  <Text style={addressText}>{order.deliveryAddress}</Text>
                </Section>
              </Section>
            )}

            {/* Production Timeline */}
            <Section style={timelineSection}>
              <Text style={sectionTitle}>ÜRETİM SÜRECİ</Text>
              <table style={timelineTable}>
                <tbody>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>01</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Sipariş Onayı</Text>
                      <Text style={stepDesc}>Siparişiniz alındı ve doğrulandı</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>02</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Üretim Hazırlığı</Text>
                      <Text style={stepDesc}>Dosyalar hazırlanıyor ve üretim planlanıyor</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>03</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>3D Baskı</Text>
                      <Text style={stepDesc}>Parçalarınız üretiliyor</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>04</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Kalite Kontrol</Text>
                      <Text style={stepDesc}>Ürünler test ediliyor ve paketleniyor</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepNumberCell}>
                      <Text style={stepNumber}>05</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Kargo ve Teslimat</Text>
                      <Text style={stepDesc}>Siparişiniz yola çıkıyor</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Info Note */}
            <Section style={noteSection}>
              <Text style={noteText}>
                Her aşamada size bilgilendirme e-postası göndereceğiz. Sipariş durumunuzu dashboard üzerinden anlık olarak takip edebilirsiniz.
              </Text>
            </Section>

            {/* CTA */}
            <Section style={ctaSection}>
              <Link href="https://axis3.com.tr/dashboard/orders" style={ctaButton}>
                SİPARİŞİ TAKİP ET
              </Link>
            </Section>

            <Text style={closing}>
              İşbirliğiniz için teşekkür ederiz,
            </Text>
            <Text style={signature}>
              AXIS3 Üretim Ekibi
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

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#333333',
  margin: '0 0 40px 0',
};

const summarySection = {
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

const summaryBox = {
  border: '1px solid #e0e0e0',
  padding: '24px',
  backgroundColor: '#fafafa',
};

const summaryTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const summaryLabelCell = {
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  width: '50%',
};

const summaryValueCell = {
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  textAlign: 'right' as const,
};

const summaryLabel = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
  fontWeight: '500',
};

const summaryLabelBold = {
  fontSize: '13px',
  color: '#000000',
  margin: '0',
  fontWeight: '600',
};

const summaryValue = {
  fontSize: '13px',
  color: '#000000',
  margin: '0',
  fontWeight: '600',
};

const summaryValueBold = {
  fontSize: '16px',
  color: '#000000',
  margin: '0',
  fontWeight: '700',
};

const summaryDiscountValue = {
  fontSize: '13px',
  color: '#16a34a',
  margin: '0',
  fontWeight: '600',
};

const itemsSection = {
  margin: '40px 0',
};

const itemBox = {
  border: '1px solid #e0e0e0',
  padding: '20px',
  marginBottom: '12px',
  backgroundColor: '#ffffff',
};

const itemTable = {
  width: '100%',
};

const itemNameCell = {
  verticalAlign: 'top' as const,
  width: '70%',
};

const itemPriceCell = {
  verticalAlign: 'top' as const,
  textAlign: 'right' as const,
};

const itemName = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 6px 0',
};

const itemDetails = {
  fontSize: '12px',
  color: '#666666',
  margin: '0',
};

const itemPrice = {
  fontSize: '15px',
  fontWeight: '700',
  color: '#000000',
  margin: '0',
};

const addressSection = {
  margin: '40px 0',
};

const addressBox = {
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #F27022',
  padding: '20px',
  backgroundColor: '#fafafa',
};

const addressText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0',
};

const timelineSection = {
  margin: '40px 0',
};

const timelineTable = {
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

const stepTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 4px 0',
};

const stepDesc = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
};

const noteSection = {
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  padding: '20px',
  margin: '40px 0',
};

const noteText = {
  fontSize: '13px',
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
