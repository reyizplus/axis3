import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Web Vitals toplama ucu.
 *
 * Istemci (`src/components/providers/web-vitals.tsx`) production'da
 * `navigator.sendBeacon('/api/v1/web-vitals', ...)` ile metrik gonderiyor.
 * Bu route olmadigi icin istekler 404 donuyor ve konsolda hata gibi gorunuyordu.
 * Su an harici bir analitik depoya yazmiyoruz; 204 ile sessizce kabul ediyoruz.
 */
export async function POST() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return NextResponse.json({ success: true, endpoint: 'web-vitals' });
}
