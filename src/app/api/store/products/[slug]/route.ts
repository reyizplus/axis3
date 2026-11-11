import { NextRequest, NextResponse } from 'next/server';
import { storeService } from '@/lib/services/store-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await storeService.getProductBySlug(slug);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API] GET /api/store/products/[slug] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
