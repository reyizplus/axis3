import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Ödeme | AXIS3',
  description: 'Siparişinizi tamamlayın ve güvenli ödeme ile 3D baskı hizmeti alın.',
  keywords: 'ödeme, sipariş, 3D baskı siparişi, AXIS3 ödeme, güvenli ödeme',
  url: `${SITE_URL}/checkout`,
  noIndex: true,
});

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
