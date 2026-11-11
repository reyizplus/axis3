/**
 * Axis3 - Health Check Endpoint
 *
 * Used by Docker healthcheck, monitoring tools, and load balancers.
 * Returns system status and basic diagnostics.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  const status = 'healthy';
  const uptime = process.uptime ? Math.floor(process.uptime()) : 0;
  const responseTime = Date.now() - startTime;
  
  const health = {
    status,
    timestamp: new Date().toISOString(),
    uptime: `${uptime}s`,
    responseTime: `${responseTime}ms`,
  };
  
  const statusCode = 200;
  
  return NextResponse.json(health, { status: statusCode });
}
