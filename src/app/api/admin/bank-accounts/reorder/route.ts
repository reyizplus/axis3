import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bankAccountService } from '@/lib/services/bank-account-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'Geçersiz sıralama' }, { status: 400 });
    }

    const result = await bankAccountService.reorderBankAccounts(orderedIds);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Sıralama güncellenemedi' }, { status: 500 });
  }
}
