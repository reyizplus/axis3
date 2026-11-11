import { Metadata } from 'next';
import { ContactContent } from '@/components/contact/contact-content';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'İletişim | AXIS3 - Bize Ulaşın',
  description: 'AXIS3 3D baskı hizmetleri hakkında sorularınız için bize ulaşın. Telefon, e-posta ve iletişim formu ile 7/24 destek.',
  keywords: 'iletişim, destek, müşteri hizmetleri, 3D baskı destek, AXIS3 iletişim',
  url: `${SITE_URL}/iletisim`,
});

export default function IletisimPage() {
  return <ContactContent />;
}
