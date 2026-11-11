import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Sipariş Takibi | AXIS3',
  description: 'Sipariş numaranız ile siparişinizin durumunu ve kargo takibini anında sorgulayın.',
  keywords: 'sipariş takip, kargo takip, sipariş sorgulama, Sürat Kargo, UPS, Aras Kargo, HepsiJet, PTT Kargo, AXIS3',
  url: `${SITE_URL}/siparis-takip`,
});

export default function SiparisTakipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
