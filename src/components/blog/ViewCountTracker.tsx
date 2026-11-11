'use client';

import { useEffect } from 'react';

interface ViewCountTrackerProps {
  slug: string;
}

/**
 * ViewCountTracker Component
 * Tracks blog post views by calling the increment API once per page load
 */
export function ViewCountTracker({ slug }: ViewCountTrackerProps) {
  useEffect(() => {
    // Track view count only once when component mounts
    const trackView = async () => {
      try {
        await fetch(`/api/blog/${slug}/increment-view`, {
          method: 'POST',
        });
      } catch (error) {
        // Silently fail - view counting is not critical
        console.error('Failed to track view:', error);
      }
    };

    trackView();
  }, [slug]); // Only run when slug changes

  // This component doesn't render anything
  return null;
}
