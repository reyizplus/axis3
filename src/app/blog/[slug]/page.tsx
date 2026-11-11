import { createClient } from '@/lib/supabase/server';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Calendar, Clock, Eye, ArrowLeft, ChevronLeft, ChevronRight, User, BookOpen, Printer, Rocket } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PostContent } from '@/components/blog/PostContent';
import { ShareButtons } from '@/components/blog/ShareButtons';
import { CategoryBadge } from '@/components/blog/CategoryBadge';
import { PostCard } from '@/components/blog/PostCard';
import { ViewCountTracker } from '@/components/blog/ViewCountTracker';
import { ReadingProgressBar } from '@/components/blog/ReadingProgressBar';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { calculateReadingTime, formatReadingTime } from '@/lib/utils/reading-time';
import { addHeadingIds } from '@/lib/utils/blog-utils';
import { generateBreadcrumbSchema, generateArticleSchema, TWITTER_HANDLE, SITE_NAME } from '@/lib/utils/seo';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  status: string;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  author_id: string | null;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface Author {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, featured_image, meta_title, meta_description, published_at, author_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!post) {
    return { title: 'Blog Yazısı Bulunamadı | AXIS3 Blog' };
  }

  const blogPost = post as {
    title: string;
    excerpt: string | null;
    featured_image: string | null;
    meta_title: string | null;
    meta_description: string | null;
    published_at: string | null;
    author_id: string | null;
  };

  let authorName = SITE_NAME;
  if (blogPost.author_id) {
    const { data: author } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', blogPost.author_id)
      .single();
    if (author && 'full_name' in author) {
      authorName = (author as { full_name: string }).full_name;
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const fullUrl = baseUrl ? `${baseUrl}/blog/${slug}` : `/blog/${slug}`;
  const title = blogPost.meta_title || blogPost.title;
  const description = blogPost.meta_description || blogPost.excerpt || blogPost.title;
  const image = blogPost.featured_image || `${baseUrl}/logo.png`;

  return {
    title: `${title} | AXIS3 Blog`,
    description,
    keywords: '3D baskı, FDM, SLA, 3D printing, additive manufacturing, Türkiye',
    authors: [{ name: authorName }],
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: 'tr_TR',
      type: 'article',
      publishedTime: blogPost.published_at || undefined,
      authors: [authorName],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: TWITTER_HANDLE,
      site: TWITTER_HANDLE,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: fullUrl,
      languages: {
        'x-default': fullUrl,
        tr: fullUrl,
      },
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient() as any;

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    notFound();
  }

  const blogPost = post as BlogPost;

  let category: BlogCategory | null = null;
  if (blogPost.category_id) {
    const { data: categoryData } = await supabase
      .from('blog_categories')
      .select('id, name, slug')
      .eq('id', blogPost.category_id)
      .single();
    category = categoryData as BlogCategory | null;
  }

  let author: Author | null = null;
  if (blogPost.author_id) {
    const { data: authorData } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', blogPost.author_id)
      .single();
    author = authorData as Author | null;
  }

  const { data: allPosts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: true });

  let prevPost: { title: string; slug: string } | null = null;
  let nextPost: { title: string; slug: string } | null = null;
  if (allPosts) {
    const idx = allPosts.findIndex((p: { id: string }) => p.id === blogPost.id);
    if (idx > 0) prevPost = allPosts[idx - 1];
    if (idx >= 0 && idx < allPosts.length - 1) nextPost = allPosts[idx + 1];
  }

  const relatedQuery = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, published_at, created_at')
    .eq('status', 'published')
    .neq('id', blogPost.id);

  if (blogPost.category_id) {
    relatedQuery.eq('category_id', blogPost.category_id);
  }

  const { data: relatedPostsData } = await relatedQuery
    .order('published_at', { ascending: false })
    .limit(3);

  const relatedPosts = (relatedPostsData || []) as Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featured_image: string | null;
    published_at: string | null;
    created_at: string;
  }>;

  const readingTime = calculateReadingTime(blogPost.content);
  const readingTimeText = formatReadingTime(readingTime);

  const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const fullUrl = baseUrl ? `${baseUrl}/blog/${blogPost.slug}` : `/blog/${blogPost.slug}`;

  const contentWithIds = addHeadingIds(blogPost.content);

  const dateStr = new Date(blogPost.published_at || blogPost.created_at).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blogPost.title,
    description: blogPost.excerpt || blogPost.title,
    image: blogPost.featured_image || `${baseUrl}/logo.png`,
    datePublished: blogPost.published_at || blogPost.created_at,
    dateModified: blogPost.updated_at || blogPost.created_at,
    author: { '@type': 'Person', name: author?.full_name || SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': fullUrl },
  };

  const breadcrumbItems = [
    { name: 'Ana Sayfa', url: baseUrl || '/' },
    { name: 'Blog', url: `${baseUrl}/blog` },
    ...(category ? [{ name: category.name, url: `${baseUrl}/blog/category/${category.slug}` }] : []),
    { name: blogPost.title, url: fullUrl },
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  return (
    <div className="min-h-screen flex flex-col">
      <ViewCountTracker slug={blogPost.slug} />
      <ReadingProgressBar />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <PublicHeader />

      <main className="flex-1">
        <article className="max-w-7xl mx-auto px-6 lg:px-8 py-8 md:py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground transition-colors">Ana Sayfa</Link>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            {category && (
              <>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                <Link href={`/blog/category/${category.slug}`} className="hover:text-foreground transition-colors">
                  {category.name}
                </Link>
              </>
            )}
          </nav>

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
            {/* Main content */}
            <div className="flex-1 min-w-0 max-w-3xl">
              {/* Hero header */}
              <header className="mb-10">
                {/* Category + meta row */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  {category && <CategoryBadge name={category.name} slug={category.slug} />}
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {dateStr}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {readingTimeText} okuma
                  </span>
                  {blogPost.view_count > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {blogPost.view_count} görüntülenme
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-4">
                  {blogPost.title}
                </h1>

                {/* Excerpt */}
                {blogPost.excerpt && (
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {blogPost.excerpt}
                  </p>
                )}

                {/* Author */}
                {author && (
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border/40">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{author.full_name}</p>
                      <p className="text-xs text-muted-foreground">AXIS3 Blog Yazarı</p>
                    </div>
                  </div>
                )}
              </header>

              {/* Featured image */}
              {blogPost.featured_image && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10 shadow-lg ring-1 ring-border/30">
                  <Image
                    src={blogPost.featured_image}
                    alt={blogPost.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 800px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                </div>
              )}

              {/* Content */}
              <div className="bg-card border border-border/40 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-sm">
                <PostContent content={contentWithIds} />
              </div>

              {/* Share */}
              <div className="flex items-center justify-between py-6 mt-8 border-y border-border/40">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{readingTimeText} okuma süresi</span>
                </div>
                <ShareButtons title={blogPost.title} url={fullUrl} />
              </div>

              {/* Author bio */}
              {author && (
                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-transparent border border-border/40">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/10 flex-shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg mb-1">{author.full_name}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {author.full_name} - AXIS3 blog yazarı. 3D baskı teknolojileri, malzemeler ve endüstriyel uygulamalar hakkında yazıyor.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prev / Next */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {prevPost ? (
                  <Link
                    href={`/blog/${prevPost.slug}`}
                    className="group flex items-center gap-4 p-5 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-300"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted shrink-0 group-hover:bg-primary/10 transition-colors">
                      <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Önceki Yazı</p>
                      <p className="text-sm font-medium truncate">{prevPost.title}</p>
                    </div>
                  </Link>
                ) : <div />}

                {nextPost ? (
                  <Link
                    href={`/blog/${nextPost.slug}`}
                    className="group flex items-center gap-4 p-5 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-300 text-right sm:text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">Sonraki Yazı</p>
                      <p className="text-sm font-medium truncate">{nextPost.title}</p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted shrink-0 group-hover:bg-primary/10 transition-colors">
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ) : <div />}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="w-full lg:w-72 flex-shrink-0">
              <div className="lg:sticky lg:top-24 space-y-8">
                {/* TOC desktop */}
                <div className="hidden lg:block p-5 rounded-2xl bg-card border border-border/40">
                  <TableOfContents content={contentWithIds} />
                </div>

                {/* TOC mobile */}
                <details className="lg:hidden group p-4 rounded-2xl bg-card border border-border/40">
                  <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-foreground list-none">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      İçindekiler
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90" />
                  </summary>
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <TableOfContents content={contentWithIds} />
                  </div>
                </details>

                {/* Sidebar CTA */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Printer className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">3D Baskıya Başlayın</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    STL dosyanızı yükleyin, saniyeler içinde fiyat teklifi alın.
                  </p>
                  <Button asChild size="sm" className="rounded-xl w-full text-xs">
                    <Link href="/upload">
                      <Rocket className="h-3.5 w-3.5" />
                      Hemen Başla
                    </Link>
                  </Button>
                </div>

                {/* Back to blog */}
                <Link
                  href="/blog"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  Blog&apos;a Dön
                </Link>
              </div>
            </aside>
          </div>

          {/* Related posts */}
          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-12 border-t border-border/40">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">İlgili Yazılar</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bu kategorideki diğer yazılar
                  </p>
                </div>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Tümünü Gör
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map(relatedPost => (
                  <PostCard
                    key={relatedPost.id}
                    title={relatedPost.title}
                    slug={relatedPost.slug}
                    excerpt={relatedPost.excerpt}
                    featuredImage={relatedPost.featured_image}
                    publishedAt={relatedPost.published_at}
                    createdAt={relatedPost.created_at}
                  />
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
