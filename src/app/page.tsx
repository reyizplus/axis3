import { Metadata } from 'next';
import { HomeContent } from '@/components/home/home-content';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  // Strip query params for canonical URL to prevent SEO duplicate content from ?ref=xxx
  return generateSEOMetadata({
    title: 'AXIS3 - Profesyonel 3D Baskı Platformu | Anında Fiyat Teklifi',
    description: 'STL dosyanızı yükleyin, anında fiyat alın. Profesyonel 3D baskı hizmeti ile projelerinizi hayata geçirin. 9+ farklı malzeme, hızlı teslimat, güvenli ödeme.',
    keywords: '3D baskı, 3D printing, STL dosya, anında fiyat, profesyonel 3D baskı, PLA, ABS, PETG, 3D yazıcı hizmeti, FDM, SLA',
    url: SITE_URL,
    alternates: {
      canonical: SITE_URL,
    },
  });
}

export const dynamic = 'force-dynamic';

interface BlogPostBrief {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  created_at: string;
}

interface BlogCategoryBrief {
  id: string;
  name: string;
}

export default async function HomePage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, published_at, created_at, category_id')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(4);

  const { data: categories } = await supabase
    .from('blog_categories')
    .select('id, name')
    .eq('is_active', true);

  const blogPosts = (posts || []) as (BlogPostBrief & { category_id: string | null })[];
  const blogCategories = (categories || []) as BlogCategoryBrief[];
  const categoryMap = new Map(blogCategories.map(c => [c.id, c.name]));

  return <HomeContent blogPosts={blogPosts} categoryMap={categoryMap} />;
}
