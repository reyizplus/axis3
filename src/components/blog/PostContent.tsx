'use client';

import 'highlight.js/styles/github-dark.css';
import DOMPurify from 'isomorphic-dompurify';

interface PostContentProps {
  content: string;
}

export function PostContent({ content }: PostContentProps) {
  const sanitized = DOMPurify.sanitize(content);
  return (
    <div
      className="axis3-prose [&_p]:whitespace-pre-wrap [&_h1]:whitespace-pre-wrap [&_h2]:whitespace-pre-wrap [&_h3]:whitespace-pre-wrap [&_h4]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap [&_blockquote]:whitespace-pre-wrap [&_img]:rounded-xl [&_img]:shadow-md [&_pre]:border [&_pre]:border-border/50 [&_pre]:shadow-sm [&_blockquote]:border-l-primary [&_blockquote]:bg-primary/5 [&_blockquote]:py-1 [&_blockquote]:pr-4 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/30 [&_a:hover]:decoration-primary [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-sm [&_hr]:border-border/60"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
