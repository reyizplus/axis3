import Link from 'next/link';

interface CategoryBadgeProps {
  name: string;
  slug?: string;
  className?: string;
  disableLink?: boolean;
}

export function CategoryBadge({ name, slug, className = '', disableLink = false }: CategoryBadgeProps) {
  const base = `inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-primary/10 text-primary transition-colors duration-200 hover:bg-primary/20 ${className}`;

  if (slug && !disableLink) {
    return (
      <Link href={`/blog/category/${slug}`} className={base}>
        {name}
      </Link>
    );
  }

  return <span className={base}>{name}</span>;
}
