import { createClient } from '@/lib/supabase/server';
import { MetadataRoute } from 'next';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  
  // Get base URL from environment variable with fallback
  // IMPORTANT: Always use .com.tr domain, not .com
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';
  
  // Safety check: If environment variable is set to .com, force .com.tr
  if (baseUrl.includes('axis3.com') && !baseUrl.includes('axis3.com.tr')) {
    console.warn('⚠️ SITEMAP: Detected axis3.com in NEXT_PUBLIC_SITE_URL, forcing axis3.com.tr');
    baseUrl = baseUrl.replace('axis3.com', 'axis3.com.tr');
  }
  
  // Remove trailing slash if present
  baseUrl = baseUrl.replace(/\/$/, '');

  // Fetch all published blog posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  const blogPosts = (posts || []).map((post: any) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updated_at || post.published_at || new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Fetch all active store products
  const { data: products } = await supabase
    .from('store_products')
    .select('slug, updated_at')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const storeProducts = (products || []).map((product: any) => ({
    url: `${baseUrl}/store/${product.slug}`,
    lastModified: product.updated_at || new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // Blog main page
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    // Static pages - Services
    {
      url: `${baseUrl}/hizmetler`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Static pages - Materials
    {
      url: `${baseUrl}/malzemeler`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Static pages - About
    {
      url: `${baseUrl}/hakkimizda`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Static pages - Contact
    {
      url: `${baseUrl}/iletisim`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Legal pages - Privacy Policy
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Legal pages - Terms of Service
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Legal pages - Delivery
    {
      url: `${baseUrl}/teslimat-kargo-politikasi`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    // Legal pages - Returns
    {
      url: `${baseUrl}/iade-iptal-politikasi`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    // Legal pages - Distance Sales
    {
      url: `${baseUrl}/mesafeli-satis-sozlesmesi`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Legal pages - KVKK
    {
      url: `${baseUrl}/kvkk-aydinlatma-metni`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Legal pages - Cookies
    {
      url: `${baseUrl}/cerez-politikasi`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Blog posts (dynamic)
    ...blogPosts,
    ...storeProducts,
  ];
}
