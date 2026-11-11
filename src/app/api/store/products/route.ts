import { NextRequest, NextResponse } from 'next/server';
import { storeService } from '@/lib/services/store-service';
import type { SortOption } from '@/lib/services/store-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filter = {
      category_slug: searchParams.get('category_slug') || undefined,
      search: searchParams.get('search') || undefined,
      min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
      max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
      sort: (searchParams.get('sort') as SortOption) || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 12,
      featured: searchParams.get('featured') === 'true' || undefined,
    };

    const result = await storeService.getProducts(filter);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API] GET /api/store/products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
