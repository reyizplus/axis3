import { NextRequest, NextResponse } from 'next/server';
import { storeService } from '@/lib/services/store-service';

export async function GET(request: NextRequest) {
  try {
    const tree = request.nextUrl.searchParams.get('tree') === 'true';

    if (tree) {
      const result = await storeService.getCategoriesTree();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result.data);
    }

    const result = await storeService.getCategories();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API] GET /api/store/categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
