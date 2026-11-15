/**
 * Axis3 - Health Check Endpoint
 *
 * Used by Docker healthcheck, monitoring tools, and load balancers.
 * Returns system status and basic diagnostics.
 *
 * Docker healthcheck'i hızlı kalmalı; bu yüzden slicer kontrolü yalnızca
 * `?deep=1` ile yapılır (yanıt süresi artar, durum kodu değişmez).
 */

import { NextResponse } from 'next/server';
import { slicerHealth } from '@/lib/pricing/server/slicer-client';

export async function GET(request: Request) {
  const startTime = Date.now();

  const status = 'healthy';
  const uptime = process.uptime ? Math.floor(process.uptime()) : 0;

  const url = new URL(request.url);
  const deep = url.searchParams.get('deep') === '1';

  // Dilimleyici yanıt vermese de servis sağlıklı sayılır: fiyat dışındaki
  // sayfalar çalışmaya devam eder. Burada amaç sorunu görünür kılmak.
  const slicer = deep ? await slicerHealth() : null;
  const responseTime = Date.now() - startTime;

  const health = {
    status,
    timestamp: new Date().toISOString(),
    uptime: `${uptime}s`,
    responseTime: `${responseTime}ms`,
    ...(slicer ? { slicer } : {}),
  };

  const statusCode = 200;

  return NextResponse.json(health, { status: statusCode });
}
