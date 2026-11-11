import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Model Yükle | AXIS3 - 3D Baskı',
  description: 'STL dosyanızı yükleyin, otomatik analiz edelim ve anında fiyat teklifi alın.',
  keywords: 'STL yükle, 3D model yükle, 3D baskı dosyası, AXIS3 upload',
  url: `${SITE_URL}/upload`,
  noIndex: true,
});

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
