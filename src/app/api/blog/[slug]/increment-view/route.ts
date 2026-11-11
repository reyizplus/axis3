import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/blog/[slug]/increment-view
 * Increment view count for a blog post
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

    // Get current post
    const { data: post, error: fetchError } = await (supabase
      .from('blog_posts') as any)
      .select('id, view_count')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment view count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('blog_posts') as any)
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', post.id);

    if (updateError) {
      console.error('Failed to increment view count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update view count' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, view_count: (post.view_count || 0) + 1 },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
