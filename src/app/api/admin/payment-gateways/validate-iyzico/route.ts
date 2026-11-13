import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/admin-helpers';
import { getIyzipayClient, isIyzicoConfigured } from '@/lib/payment/iyzico-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/payment-gateways/validate-iyzico
 *
 * Admin-only. Performs a real iyzico API test call (`GET /payment/test`)
 * instead of only checking that env variables exist.
 */
export async function POST() {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase);
  if (guard) return guard;

  if (!isIyzicoConfigured()) {
    return NextResponse.json({
      valid: false,
      message: 'iyzico yapılandırılmamış. IYZICO_API_KEY, IYZICO_SECRET_KEY ve IYZICO_BASE_URL tanımlanmalıdır.',
    });
  }

  try {
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      // `apiTest` exists in the iyzico SDK runtime but is missing from its
      // bundled TypeScript declarations.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getIyzipayClient() as any).apiTest.retrieve({}, (err: unknown, res: Record<string, unknown>) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    if (result?.status === 'success') {
      return NextResponse.json({
        valid: true,
        message: 'iyzico bağlantısı doğrulandı',
        environment: (process.env.IYZICO_BASE_URL || '').includes('sandbox') ? 'sandbox' : 'production',
      });
    }

    return NextResponse.json({
      valid: false,
      message: (result?.errorMessage as string) || 'iyzico doğrulaması başarısız oldu',
    });
  } catch (error) {
    console.error('[Validate iyzico] API test failed:', error);
    return NextResponse.json({
      valid: false,
      message: error instanceof Error ? error.message : 'iyzico bağlantısı kurulamadı',
    });
  }
}
