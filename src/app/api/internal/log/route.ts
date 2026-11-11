import { NextRequest, NextResponse } from 'next/server';
import { appendLog } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Missing required field: message' }, { status: 400 });
    }

    appendLog(message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Internal] Log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
