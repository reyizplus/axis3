'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function StorePagination({ currentPage, totalPages, onPageChange }: StorePaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1;

    pages.push(1);

    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    if (start > 2) pages.push('ellipsis');

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) pages.push('ellipsis');

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-9 w-9 rounded-xl border-muted-foreground/20 hover:bg-muted/50"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1">
        {visiblePages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground/40 select-none">
              ···
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              className={cn(
                'min-w-[2.25rem] h-9 rounded-xl text-sm font-medium transition-all',
                page === currentPage
                  ? 'shadow-sm'
                  : 'border-muted-foreground/20 hover:bg-muted/50 text-muted-foreground'
              )}
            >
              {page}
            </Button>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-9 w-9 rounded-xl border-muted-foreground/20 hover:bg-muted/50"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
