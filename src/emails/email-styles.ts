export const brand = {
  primary: '#F27022',
  primaryDark: '#D45A0F',
  primaryLight: '#FF8C42',
  gradient: 'linear-gradient(135deg, #F27022, #FF8C42)',
  bg: '#f5f5f5',
  card: '#ffffff',
  text: '#333333',
  textMuted: '#666666',
  textDark: '#000000',
  border: '#e0e0e0',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
};

export const headerStyles = {
  backgroundColor: '#000000',
  padding: '40px 40px 32px',
  borderBottom: `4px solid ${brand.primary}`,
};

export const logoText = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  letterSpacing: '4px',
  textTransform: 'uppercase' as const,
  fontFamily: brand.font,
};

export const headerLine = {
  color: '#999999',
  fontSize: '10px',
  fontWeight: '500',
  margin: '0',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
};

export const container = {
  backgroundColor: brand.card,
  margin: '0 auto',
  maxWidth: '600px',
  border: `1px solid ${brand.border}`,
};

export const main = {
  backgroundColor: brand.bg,
  fontFamily: brand.font,
  padding: '40px 20px',
};

export const content = {
  padding: '48px 40px',
};

export const title = {
  fontSize: '24px',
  fontWeight: '600',
  color: brand.textDark,
  margin: '0 0 32px 0',
  letterSpacing: '-0.5px',
};

export const paragraph = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: brand.text,
  margin: '0 0 40px 0',
};

export const sectionTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: brand.textDark,
  margin: '0 0 16px 0',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
};

export const ctaButton = {
  display: 'inline-block' as const,
  backgroundColor: brand.primary,
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '16px 48px',
  borderRadius: '8px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
};

export const footer = {
  backgroundColor: brand.bg,
  padding: '32px 40px',
  borderTop: `1px solid ${brand.border}`,
  textAlign: 'center' as const,
};

export const footerText = {
  fontSize: '12px',
  color: brand.textMuted,
  margin: '0 0 8px 0',
  lineHeight: '1.5',
};

export const footerDivider = {
  fontSize: '12px',
  color: '#cccccc',
  margin: '16px 0',
};

export const footerLinks = {
  fontSize: '12px',
  color: '#999999',
  margin: '0',
};

export const signature = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: brand.textDark,
  margin: '40px 0',
  fontWeight: '600',
};

export function getHeader(): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 40px 32px;border-bottom:4px solid #F27022">
      <tr>
        <td align="center">
          <div style="color:#ffffff;font-size:28px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin:0 0 8px 0">AXIS3</div>
          <div style="color:#999999;font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase">Profesyonel 3D Baskı Platformu</div>
        </td>
      </tr>
    </table>
  `;
}

export function getFooter(): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 40px;border-top:1px solid #e0e0e0;text-align:center">
      <tr>
        <td align="center">
          <div style="font-size:12px;color:#666666;margin:0 0 8px 0;line-height:1.5">© 2026 AXIS3 - Endüstriyel 3D Baskı Çözümleri. Tüm hakları saklıdır.</div>
          <div style="font-size:12px;color:#666666;margin:0 0 8px 0;line-height:1.5">Bu e-posta otomatik olarak oluşturulmuştur. Lütfen yanıtlamayınız.</div>
          <div style="font-size:12px;color:#cccccc;margin:16px 0">—</div>
          <div style="font-size:12px;color:#999999;margin:0">axis3.com.tr | destek@axis3.com.tr | +90 501 045 27 78</div>
        </td>
      </tr>
    </table>
  `;
}