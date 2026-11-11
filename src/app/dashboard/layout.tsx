import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Panel | AXIS3',
  description: 'AXIS3 kullanıcı paneli - siparişlerinizi yönetin, 3D baskı dosyalarınızı görüntüleyin.',
  keywords: 'kullanıcı paneli, siparişlerim, 3D baskı dosyaları, AXIS3 panel',
  url: `${SITE_URL}/dashboard`,
  noIndex: true,
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
