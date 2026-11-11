import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { storeService } from '@/lib/services/store-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    const filter = {
      category_slug: searchParams.get('category_slug') || undefined,
      search: searchParams.get('search') || undefined,
      min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
      max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
      sort: (searchParams.get('sort') as any) || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 50,
    };
    const result = await storeService.getProducts(filter);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API] GET /api/admin/store/products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const result = await storeService.createProduct(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/admin/store/products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
