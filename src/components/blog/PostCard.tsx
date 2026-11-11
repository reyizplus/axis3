import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock } from 'lucide-react';
import { CategoryBadge } from '@/components/blog/CategoryBadge';

interface PostCardProps {
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  categoryName?: string;
  categorySlug?: string;
  publishedAt: string | null;
  readingTime?: number;
  createdAt: string;
  variant?: 'default' | 'featured';
}

export function PostCard({
  title,
  slug,
  excerpt,
  featuredImage,
  categoryName,
  categorySlug,
  publishedAt,
  readingTime,
  createdAt,
  variant = 'default',
}: PostCardProps) {
  const date = new Date(publishedAt || createdAt);
  const formattedDate = date.toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const isFeatured = variant === 'featured';

  return (
    <Link
      href={`/blog/${slug}`}
      className={`group block rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ${
        isFeatured ? 'md:col-span-2 md:grid md:grid-cols-2' : ''
      }`}
    >
      {/* Image */}
      {featuredImage ? (
        <div className={`relative overflow-hidden ${isFeatured ? 'h-64 md:h-full' : 'h-52'}`}>
          <Image
            src={featuredImage}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={isFeatured ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      ) : (
        <div className={`relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/[0.02] to-muted flex items-center justify-center ${isFeatured ? 'h-64 md:h-full' : 'h-52'}`}>
          <div className="text-6xl font-bold text-primary/10 select-none">A3</div>
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col ${isFeatured ? 'justify-center p-8' : 'p-5'}`}>
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3">
          {categoryName && (
            <CategoryBadge name={categoryName} slug={categorySlug} disableLink />
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
          {readingTime && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {readingTime} dk
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className={`font-bold leading-snug text-foreground group-hover:text-primary transition-colors duration-300 ${
          isFeatured ? 'text-2xl md:text-3xl mb-4' : 'text-lg mb-2'
        }`}>
          {title}
        </h2>

        {/* Excerpt */}
        {excerpt && (
          <p className={`text-muted-foreground leading-relaxed ${
            isFeatured ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'
          }`}>
            {excerpt}
          </p>
        )}

        {/* Read more indicator */}
        <span className="inline-flex items-center gap-1.5 mt-auto pt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          Okumaya Devam Et
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
