/**
 * Order Status Update Email Template
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
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/email/types';

interface OrderStatusUpdateProps {
  order: {
    orderNumber: string;
    orderId: string;
    oldStatus: string;
    newStatus: string;
    totalPrice: number;
    estimatedDeliveryDate?: string;
    trackingNumber?: string;
    cargoCompany?: string;
    items: Array<{
      fileName: string;
      quantity: number;
    }>;
    dashboardUrl: string;
  };
}

const CARGO_COMPANY_INFO: Record<string, { name: string; logoUrl: string; trackingUrl: string }> = {
  surat: { name: 'Sürat Kargo', logoUrl: 'https://axis3.com.tr/images/cargo/surat.png', trackingUrl: 'https://www.suratkargo.com.tr/KargoTakip/?kargotakip=' },
  ups: { name: 'UPS', logoUrl: 'https://axis3.com.tr/images/cargo/ups.svg', trackingUrl: 'https://www.ups.com/track?tracknum=' },
  aras: { name: 'Aras Kargo', logoUrl: 'https://axis3.com.tr/images/cargo/aras.svg', trackingUrl: 'https://www.araskargo.com.tr/tr/tracking?trackingNumber=' },
  hepsijet: { name: 'HepsiJet', logoUrl: 'https://axis3.com.tr/images/cargo/hepsijet.svg', trackingUrl: 'https://www.hepsijet.com/takip?trackingNumber=' },
  ptt: { name: 'PTT Kargo', logoUrl: 'https://axis3.com.tr/images/cargo/ptt.png', trackingUrl: 'https://gonderitakip.ptt.gov.tr/?code=' },
};

export default function OrderStatusUpdate({ order }: OrderStatusUpdateProps) {
  const formattedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalPrice);
  const currentStatusLabel =
    ORDER_STATUS_LABELS[order.newStatus as OrderStatus] || 'Sipariş durumu güncellendi';
  const isCompleted = order.newStatus === 'delivered';
  const isCancelled = order.newStatus === 'cancelled';
  const isShipped = order.newStatus === 'shipped' || order.newStatus === 'delivered';

  return (
    <Html>
      <Head />
      <Preview>Sipariş durumu güncellendi — {order.orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>AXIS3</Text>
            <Text style={headerLine}>Profesyonel 3D Baskı Platformu</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={title}>Sipariş Durum Güncelleme</Text>
            
            <Text style={paragraph}>
              Sipariş numarası <strong>{order.orderNumber}</strong> olan siparişinizin durumu güncellendi.
            </Text>

            {/* Status Update */}
            <Section style={statusSection}>
              <Text style={statusLabel}>GÜNCEL DURUM</Text>
              <Section style={statusBox}>
                <Text style={statusText}>{currentStatusLabel}</Text>
              </Section>
            </Section>

            {/* Order Information */}
            <Section style={infoSection}>
              <Text style={sectionTitle}>SİPARİŞ BİLGİLERİ</Text>
              <Section style={infoBox}>
                <table style={infoTable}>
                  <tbody>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Sipariş No</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>{order.orderNumber}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Toplam Tutar</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValue}>{formattedTotal}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={infoLabelCell}>
                        <Text style={infoLabel}>Durum</Text>
                      </td>
                      <td style={infoValueCell}>
                        <Text style={infoValueBold}>{currentStatusLabel}</Text>
                      </td>
                    </tr>
                    {order.items && order.items.length > 0 && (
                      <tr>
                        <td style={infoLabelCell}>
                          <Text style={infoLabel}>Ürün Sayısı</Text>
                        </td>
                        <td style={infoValueCell}>
                          <Text style={infoValue}>{order.items.length} adet</Text>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Section>
            </Section>

            {/* Shipping Information */}
            {isShipped && (order.estimatedDeliveryDate || order.trackingNumber) && (
              <Section style={shippingSection}>
                <Text style={sectionTitle}>TESLİMAT BİLGİLERİ</Text>
                <Section style={shippingBox}>
                  {order.cargoCompany && CARGO_COMPANY_INFO[order.cargoCompany] && (
                    <Section style={cargoLogoSection}>
                      <img
                        src={CARGO_COMPANY_INFO[order.cargoCompany].logoUrl}
                        alt={CARGO_COMPANY_INFO[order.cargoCompany].name}
                        width="120"
                        height="36"
                        style={cargoLogo}
                      />
                    </Section>
                  )}
                  <table style={shippingTable}>
                    <tbody>
                      {order.estimatedDeliveryDate && (
                        <tr>
                          <td style={shippingLabelCell}>
                            <Text style={shippingLabel}>Tahmini Teslimat</Text>
                          </td>
                          <td style={shippingValueCell}>
                            <Text style={shippingValue}>{order.estimatedDeliveryDate}</Text>
                          </td>
                        </tr>
                      )}
                      {order.trackingNumber && (
                        <tr>
                          <td style={shippingLabelCell}>
                            <Text style={shippingLabel}>Takip Numarası</Text>
                          </td>
                          <td style={shippingValueCell}>
                            <Text style={shippingValueBold}>{order.trackingNumber}</Text>
                          </td>
                        </tr>
                      )}
                      {order.trackingNumber && order.cargoCompany && CARGO_COMPANY_INFO[order.cargoCompany] && (
                        <tr>
                          <td style={shippingLabelCell}>
                            <Text style={shippingLabel}>Takip Linki</Text>
                          </td>
                          <td style={shippingValueCell}>
                            <Link
                              href={`${CARGO_COMPANY_INFO[order.cargoCompany].trackingUrl}${encodeURIComponent(order.trackingNumber)}`}
                              style={trackingLink}
                            >
                              Kargoyu Takip Et →
                            </Link>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Section>
              </Section>
            )}

            {/* Completion Message */}
            {isCompleted && (
              <Section style={completionSection}>
                <Text style={completionTitle}>SİPARİŞ TAMAMLANDI</Text>
                <Text style={completionText}>
                  Siparişiniz başarıyla teslim edilmiştir. AXIS3 hizmetlerini tercih ettiğiniz için teşekkür ederiz.
                </Text>
                <Text style={completionText}>
                  Hizmet kalitemizi geliştirmek için geri bildirimlerinizi bekliyoruz.
                </Text>
              </Section>
            )}

            {/* Cancellation Message */}
            {isCancelled && (
              <Section style={cancellationSection}>
                <Text style={cancellationTitle}>SİPARİŞ İPTAL EDİLDİ</Text>
                <Text style={cancellationText}>
                  Siparişiniz iptal edilmiştir. Ödeme yaptıysanız, iade işlemi 3-5 iş günü içinde hesabınıza yansıyacaktır.
                </Text>
                <Text style={cancellationText}>
                  Sorularınız için lütfen destek ekibimizle iletişime geçiniz.
                </Text>
              </Section>
            )}

            {/* Progress Timeline */}
            {!isCancelled && (
              <Section style={timelineSection}>
                <Text style={sectionTitle}>SİPARİŞ TAKİBİ</Text>
                <table style={timelineTable}>
                  <tbody>
                    <tr>
                      <td style={getStepStyle(order.newStatus, 'pending')}>
                        <Text style={stepNumber}>01</Text>
                      </td>
                      <td style={stepContentCell}>
                        <Text style={getStepTitleStyle(order.newStatus, 'pending')}>Sipariş Alındı</Text>
                        <Text style={stepDesc}>Siparişiniz sisteme kaydedildi</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={getStepStyle(order.newStatus, 'payment_received')}>
                        <Text style={stepNumber}>02</Text>
                      </td>
                      <td style={stepContentCell}>
                        <Text style={getStepTitleStyle(order.newStatus, 'payment_received')}>Ödeme Onaylandı</Text>
                        <Text style={stepDesc}>Ödemeniz doğrulandı</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={getStepStyle(order.newStatus, 'preparing')}>
                        <Text style={stepNumber}>03</Text>
                      </td>
                      <td style={stepContentCell}>
                        <Text style={getStepTitleStyle(order.newStatus, 'preparing')}>Hazırlanıyor</Text>
                        <Text style={stepDesc}>Dosyalarınız kontrol ediliyor</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={getStepStyle(order.newStatus, 'printing')}>
                        <Text style={stepNumber}>04</Text>
                      </td>
                      <td style={stepContentCell}>
                        <Text style={getStepTitleStyle(order.newStatus, 'printing')}>Baskı ve Kalite Kontrol</Text>
                        <Text style={stepDesc}>Parçalarınız üretiliyor ve kontrol ediliyor</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={getStepStyle(order.newStatus, 'packaging')}>
                        <Text style={stepNumber}>05</Text>
                      </td>
                      <td style={stepContentCell}>
                        <Text style={getStepTitleStyle(order.newStatus, 'packaging')}>Paketleniyor</Text>
                        <Text style={stepDesc}>Siparişiniz kargoya hazırlanıyor</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={getStepStyle(order.newStatus, 'shipped')}>
                        <Text style={stepNumber}>06</Text>
                      </td>
                      <td style={stepContentCell}>
                        <Text style={getStepTitleStyle(order.newStatus, 'shipped')}>Kargoda</Text>
                        <Text style={stepDesc}>Siparişiniz yolda</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={getStepStyle(order.newStatus, 'delivered')}>
                        <Text style={stepNumber}>07</Text>
                      </td>
                      <td style={stepContentCell}>
                        <Text style={getStepTitleStyle(order.newStatus, 'delivered')}>Teslim Edildi</Text>
                        <Text style={stepDesc}>Sipariş tamamlandı</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            )}

            {/* CTA */}
            <Section style={ctaSection}>
              <Link href={order.dashboardUrl} style={ctaButton}>
                SİPARİŞ DETAYLARI
              </Link>
            </Section>

            {/* Support */}
            <Section style={supportSection}>
              <Text style={supportTitle}>DESTEK</Text>
              <Text style={supportText}>
                Sorularınız için destek ekibimiz her zaman hizmetinizdedir.
              </Text>
              <Text style={supportContact}>
                destek@axis3.com.tr | +90 501 045 27 78
              </Text>
            </Section>

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

// Helper functions
function getStatusOrder(status: string): number {
  const order: { [key: string]: number } = {
    pending: 1,
    payment_received: 2,
    preparing: 3,
    printing: 4,
    quality_check: 4,
    packaging: 5,
    shipped: 6,
    delivered: 7,
  };
  return order[status] || 0;
}

function getStepStyle(currentStatus: string, stepStatus: string) {
  const isActive = getStatusOrder(currentStatus) >= getStatusOrder(stepStatus);
  return {
    ...stepNumberCell,
    opacity: isActive ? '1' : '0.3',
  };
}

function getStepTitleStyle(currentStatus: string, stepStatus: string) {
  const isActive = getStatusOrder(currentStatus) >= getStatusOrder(stepStatus);
  return {
    ...stepTitle,
    color: isActive ? '#000000' : '#999999',
  };
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

const statusSection = {
  textAlign: 'center' as const,
  margin: '40px 0',
};

const statusLabel = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#666666',
  margin: '0 0 16px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const statusBox = {
  backgroundColor: '#000000',
  padding: '20px',
  border: '2px solid #F27022',
};

const statusText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
};

const infoSection = {
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

const infoValueBold = {
  fontSize: '14px',
  color: '#000000',
  margin: '0',
  fontWeight: '700',
};

const shippingSection = {
  margin: '40px 0',
};

const shippingBox = {
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #F27022',
  padding: '24px',
  backgroundColor: '#fafafa',
};

const shippingTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const shippingLabelCell = {
  padding: '10px 0',
  width: '45%',
};

const shippingValueCell = {
  padding: '10px 0',
  textAlign: 'right' as const,
};

const shippingLabel = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
  fontWeight: '500',
};

const shippingValue = {
  fontSize: '13px',
  color: '#000000',
  margin: '0',
  fontWeight: '600',
};

const shippingValueBold = {
  fontSize: '14px',
  color: '#000000',
  margin: '0',
  fontWeight: '700',
  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
};

const completionSection = {
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #F27022',
  padding: '24px',
  margin: '40px 0',
};

const completionTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 12px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const completionText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0 0 12px 0',
};

const cancellationSection = {
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #F27022',
  padding: '24px',
  margin: '40px 0',
};

const cancellationTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 12px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const cancellationText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0 0 12px 0',
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
  margin: '0 0 4px 0',
};

const stepDesc = {
  fontSize: '13px',
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
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  padding: '20px',
  margin: '40px 0',
  textAlign: 'center' as const,
};

const supportTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 12px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

const supportText = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0 0 8px 0',
};

const supportContact = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
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

const cargoLogoSection = {
  textAlign: 'center' as const,
  padding: '12px 0',
  borderBottom: '1px solid #e0e0e0',
  marginBottom: '16px',
};

const cargoLogo = {
  display: 'inline-block',
  maxWidth: '120px',
  maxHeight: '40px',
  objectFit: 'contain' as const,
};

const trackingLink = {
  color: '#000000',
  fontSize: '13px',
  fontWeight: '600',
  textDecoration: 'underline',
};
