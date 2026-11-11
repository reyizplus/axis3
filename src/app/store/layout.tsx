import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Mağaza | AXIS3 - 3D Baskı Ürünleri ve Malzemeleri',
  description: '3D baskı ürünleri, aksesuarlar ve sarf malzemeleri. PLA, ABS, PETG filamentler ve daha fazlası AXIS3 mağazasında.',
  keywords: '3D baskı ürünleri, filament, PLA filament, 3D yazıcı aksesuarları, 3D baskı malzemeleri',
  url: `${SITE_URL}/store`,
});

import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen">{children}</main>
      <PublicFooter />
    </>
  );
}
