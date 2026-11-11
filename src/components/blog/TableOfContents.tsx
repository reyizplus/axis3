'use client';

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ListOrdered } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  const headings = useMemo(() => {
    const items: TocItem[] = [];
    const regex = /<h([1-3])(?:\s[^>]*)?>(.*?)<\/h\1>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const level = parseInt(match[1]);
      const rawText = match[2].replace(/<[^>]+>/g, '').trim();
      const id = rawText
        .toLowerCase()
        .replace(/[^\w\sçşğüöı]/g, '')
        .replace(/\s+/g, '-');
      if (rawText) items.push({ id, text: rawText, level });
    }
    return items;
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    const elements: Element[] = [];
    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        elements.push(el);
      }
    }

    return () => {
      for (const el of elements) observer.unobserve(el);
    };
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', `#${id}`);
    }
  };

  if (headings.length < 2) return null;

  return (
    <nav aria-label="İçindekiler">
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ListOrdered className="h-3.5 w-3.5" />
        İçindekiler
      </div>
      <ul className="space-y-0.5">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <button
              onClick={() => scrollToHeading(id)}
              className={cn(
                'w-full text-left py-1.5 text-sm transition-all duration-200 border-l-2 rounded-r-lg px-3',
                level === 1 && 'pl-3',
                level === 2 && 'pl-6',
                level === 3 && 'pl-9',
                activeId === id
                  ? 'border-primary bg-primary/5 text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              {text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
