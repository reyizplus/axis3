import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('store_products')
    .select('name, short_description, main_image_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!product) {
    return { title: 'Ürün Bulunamadı | AXIS3 Mağaza' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';
  const title = `${product.name} | AXIS3 Mağaza`;
  const description = product.short_description || `${product.name} - AXIS3 mağazasında. En iyi fiyat ve hızlı teslimat.`;
  const image = product.main_image_url || `${siteUrl}/logo.png`;

  return {
    title,
    description,
    keywords: '3D baskı, 3D printing, STL dosya, 3D yazıcı ürünleri, AXIS3 mağaza',
    openGraph: {
      title,
      description,
      url: `${siteUrl}/store/${slug}`,
      siteName: 'AXIS3',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: 'tr_TR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${siteUrl}/store/${slug}`,
      languages: {
        'x-default': `${siteUrl}/store/${slug}`,
        tr: `${siteUrl}/store/${slug}`,
      },
    },
  };
}

export default function StoreProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
