import type { Metadata } from 'next';
import AuthLayoutClient from './auth-layout-client';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = {
  title: {
    template: '%s | AXIS3',
    default: 'AXIS3',
  },
  description: 'AXIS3 hesabınıza giriş yapın veya yeni hesap oluşturun. 3D baskı hizmetlerimizden yararlanmak için hemen kaydolun.',
  keywords: 'giriş, kayıt, hesap oluştur, AXIS3 giriş, 3D baskı hesabı',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    locale: 'tr_TR',
    siteName: 'AXIS3',
    title: 'AXIS3',
    description: 'AXIS3 hesabınıza giriş yapın veya yeni hesap oluşturun. 3D baskı hizmetlerimizden yararlanmak için hemen kaydolun.',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: `${SITE_URL}/auth`,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
