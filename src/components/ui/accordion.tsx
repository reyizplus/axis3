'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/index';

interface AccordionProps {
  children: ReactNode;
  className?: string;
}

interface AccordionItemProps {
  isOpen: boolean;
  onToggle: () => void;
  trigger: ReactNode;
  content: ReactNode;
  className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
}

export function AccordionItem({
  isOpen,
  onToggle,
  trigger,
  content,
  className,
}: AccordionItemProps) {
  return (
    <div className={cn('border border-border/50 rounded-lg overflow-hidden', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
      >
        {trigger}
      </button>
      
      {isOpen && (
        <div className="accordion-content">
          {content}
        </div>
      )}
    </div>
  );
}
