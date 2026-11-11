import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('store_cart_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out items referencing inactive/deleted products
    const svc = createServiceClient();
    const productIds = (data || []).map(i => i.product_id);
    let activeProductIds = new Set<string>();

    if (productIds.length > 0) {
      const { data: products } = await svc
        .from('store_products')
        .select('id')
        .eq('is_active', true)
        .in('id', productIds);
      activeProductIds = new Set((products || []).map(p => p.id));
    }

    const items = (data || [])
      .filter(i => activeProductIds.has(i.product_id))
      .map((i) => ({
        productId: i.product_id,
        name: i.product_name,
        slug: i.product_slug,
        imageUrl: i.image_url,
        unitPrice: i.unit_price,
        quantity: i.quantity,
        totalPrice: i.total_price,
      }));

    // Deduplicate in case of race condition duplicates
    const seen = new Map<string, typeof items[0]>();
    for (const item of items) {
      const existing = seen.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalPrice = existing.unitPrice * existing.quantity;
      } else {
        seen.set(item.productId, { ...item });
      }
    }

    return NextResponse.json({ items: Array.from(seen.values()) });
  } catch (error) {
    console.error('[Cart Sync GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body as { items: Array<{
      productId: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }> };

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    const svc = createServiceClient();

    if (items.length > 0) {
      const dbItems = items.map(item => ({
        user_id: user.id,
        product_id: item.productId,
        product_name: item.name,
        product_slug: item.slug,
        image_url: item.imageUrl,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        total_price: item.totalPrice,
      }));

      // Upsert — ON CONFLICT (user_id, product_id) DO UPDATE
      // Eliminates race condition between concurrent sync requests
      const { error: upsertError } = await svc
        .from('store_cart_items')
        .upsert(dbItems, { onConflict: 'user_id, product_id' });

      if (upsertError) {
        console.error('[Cart Sync] Failed to upsert items:', upsertError);
        return NextResponse.json({ error: 'Failed to sync cart' }, { status: 500 });
      }

      // Delete items user removed from cart (not in current request)
      const productIds = items.map(i => i.productId);
      const { data: allRows } = await svc
        .from('store_cart_items')
        .select('id, product_id')
        .eq('user_id', user.id);

      if (allRows && allRows.length > 0) {
        const toDelete = allRows
          .filter((row) => !productIds.includes(row.product_id))
          .map((row) => row.id);
        if (toDelete.length > 0) {
          await svc.from('store_cart_items').delete().in('id', toDelete);
        }
      }
    } else {
      const { error: deleteError } = await svc
        .from('store_cart_items')
        .delete()
        .eq('user_id', user.id);
      if (deleteError) {
        console.error('[Cart Sync] Failed to clear items:', deleteError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cart Sync] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
