/**
 * POST /api/v1/orders/quote
 *
 * Sepetin sunucu fiyatlarıyla teklifini döndürür. Sipariş oluşturmaz, stok
 * düşmez, kupon rezerve etmez.
 *
 * Neden var: sepette adet değiştiğinde fiyat `birim × adet` ile hesaplanıyordu.
 * Oysa birim fiyat adede bağlıdır (adet indirimi + satır başına bir kez alınan
 * servis/hazırlık giderleri). İstemci bu yüzden sunucunun kabul etmediği bir
 * toplam gösteriyor, sipariş `409 price_changed` ile dönüyor ve müşteri
 * "fiyatlar güncellendi" uyarısıyla ikinci kez onaylamak zorunda kalıyordu.
 * Sepet/checkout bu uçtan gelen fiyatları gösterir; sipariş tek tıkla oluşur.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { quoteOrder, OrderCreationError } from '@/lib/services/order-creation-service';
import { createQuoteRateLimiter } from '@/lib/utils/rate-limit-configs';
import { quoteCartSchema } from './schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Oturum süreniz dolmuş' },
        { status: 401 }
      );
    }

    const limiter = createQuoteRateLimiter();
    const rate = await limiter.limit(user.id);
    if (!rate.success) {
      return NextResponse.json(
        { success: false, error: 'Çok fazla fiyat isteği. Lütfen kısa bir süre sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = quoteCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Geçersiz istek' },
        { status: 400 }
      );
    }

    const quote = await quoteOrder(parsed.data);
    return NextResponse.json({ success: true, quote });
  } catch (error) {
    if (error instanceof OrderCreationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.status }
      );
    }
    console.error('[Order Quote API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Fiyat hesaplanamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
