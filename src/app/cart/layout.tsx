import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Sepet | AXIS3',
  description: 'Alışveriş sepetinizdeki ürünleri ve 3D baskı siparişlerinizi görüntüleyin.',
  keywords: 'sepet, alışveriş, 3D baskı siparişi, AXIS3 sepet',
  url: `${SITE_URL}/cart`,
  noIndex: true,
});

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
