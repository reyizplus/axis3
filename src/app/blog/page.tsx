import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { createClient } from '@/lib/supabase/server';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { PostCard } from '@/components/blog/PostCard';
import { calculateReadingTime } from '@/lib/utils/reading-time';
import { Newspaper, Rss, ChevronLeft, ChevronRight } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';
const POSTS_PER_PAGE = 12;

export const metadata: Metadata = generateSEOMetadata({
  title: 'Blog | AXIS3 - 3D Baskı Teknolojileri, İpuçları ve Haberler',
  description: '3D baskı teknolojileri, malzeme rehberleri, endüstriyel uygulamalar ve ipuçları. AXIS3 blog ile 3D baskı dünyasındaki yenilikleri keşfedin.',
  keywords: '3D baskı blog, 3D printing Türkiye, FDM ipuçları, SLA rehber, 3D yazıcı malzemeleri',
  url: `${SITE_URL}/blog`,
});

export const dynamic = 'force-dynamic';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  published_at: string | null;
  view_count: number;
  created_at: string;
  category_id: string | null;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export default async function BlogPage(props: { searchParams?: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const currentPage = Math.max(1, parseInt(searchParams?.page || '1') || 1);
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('blog_categories')
    .select('id, name, slug')
    .eq('is_active', true);

  const { count: totalPosts } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  const totalPages = Math.ceil((totalPosts || 0) / POSTS_PER_PAGE);

  const from = (currentPage - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to);

  const blogPosts = (posts || []) as BlogPost[];
  const blogCategories = (categories || []) as BlogCategory[];
  const categoryMap = new Map(blogCategories.map(cat => [cat.id, { name: cat.name, slug: cat.slug }]));

  const featured = currentPage === 1 && blogPosts.length > 0 ? blogPosts[0] : null;
  const remaining = featured ? blogPosts.slice(1) : blogPosts;

  const categoryCounts = new Map<string, number>();
  for (const post of blogPosts) {
    if (post.category_id) {
      categoryCounts.set(post.category_id, (categoryCounts.get(post.category_id) || 0) + 1);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative border-b border-border/40">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-primary/10 text-primary">
                  <Newspaper className="h-3.5 w-3.5" />
                  Blog
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
                3D Baskı{' '}
                <span className="gradient-text">Dünyası</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                3D baskı teknolojileri, malzeme rehberleri, endüstriyel uygulamalar ve ipuçları.
                AXIS3 blog ile 3D baskı dünyasındaki yenilikleri keşfedin.
              </p>
            </div>

            {/* Category labels */}
            {blogCategories.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-1">
                  Kategoriler
                </span>
                {blogCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border border-border/60 text-muted-foreground"
                  >
                    {cat.name}
                    {categoryCounts.get(cat.id) && (
                      <span className="text-[10px] opacity-60">({categoryCounts.get(cat.id)})</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Posts */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16">
          {blogPosts.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <Rss className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </div>
              <h2 className="text-xl font-semibold">Henüz içerik yok</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Henüz yayınlanmış blog yazısı bulunmuyor. Yakında yeni içeriklerle karşınızda olacağız.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Featured post */}
              {featured && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Öne Çıkan
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PostCard
                      title={featured.title}
                      slug={featured.slug}
                      excerpt={featured.excerpt}
                      featuredImage={featured.featured_image}
                      categoryName={featured.category_id ? categoryMap.get(featured.category_id)?.name : undefined}
                      categorySlug={featured.category_id ? categoryMap.get(featured.category_id)?.slug : undefined}
                      publishedAt={featured.published_at}
                      readingTime={calculateReadingTime(featured.content || '')}
                      createdAt={featured.created_at}
                      variant="featured"
                    />
                    {/* Remaining feature slot */}
                  </div>
                </div>
              )}

              {/* Remaining posts */}
              {remaining.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tüm Yazılar
                    </span>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {remaining.map((post) => {
                      const category = post.category_id ? categoryMap.get(post.category_id) : undefined;
                      return (
                        <PostCard
                          key={post.id}
                          title={post.title}
                          slug={post.slug}
                          excerpt={post.excerpt}
                          featuredImage={post.featured_image}
                          categoryName={category?.name}
                          categorySlug={category?.slug}
                          publishedAt={post.published_at}
                          readingTime={calculateReadingTime(post.content || '')}
                          createdAt={post.created_at}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {remaining.length === 0 && featured && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Daha fazla yazı yakında yayınlanacak.
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              {currentPage > 1 && (
                <Link
                  href={currentPage === 2 ? '/blog' : `/blog?page=${currentPage - 1}`}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Önceki
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, idx, arr) => {
                  const nodes = [];
                  if (idx > 0 && arr[idx - 1] !== p - 1) {
                    nodes.push(<span key={`dots-${p}`} className="text-muted-foreground px-1">...</span>);
                  }
                  nodes.push(
                    <Link
                      key={p}
                      href={p === 1 ? '/blog' : `/blog?page=${p}`}
                      className={`inline-flex items-center justify-center w-9 h-9 text-sm rounded-lg border transition-all ${
                        p === currentPage
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border/60 hover:border-primary/30 hover:bg-primary/5'
                      }`}
                    >
                      {p}
                    </Link>
                  );
                  return nodes;
                })}
              {currentPage < totalPages && (
                <Link
                  href={`/blog?page=${currentPage + 1}`}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  Sonraki <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
