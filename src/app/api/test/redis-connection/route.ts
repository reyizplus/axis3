/**
 * Axis3 - Redis Connection Test
 * Tests Redis connectivity from Next.js container
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Import ioredis dynamically
    const Redis = (await import('ioredis')).default;
    
    // Create Redis client
    const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });

    // Test: PING
    const pingResult = await redis.ping();
    const pingLatency = Date.now() - startTime;

    // Test: SET and GET
    const testKey = 'axis3:test:connection';
    const testValue = `test-${Date.now()}`;
    
    await redis.set(testKey, testValue, 'EX', 60); // Expire in 60 seconds
    const getValue = await redis.get(testKey);
    
    const totalLatency = Date.now() - startTime;

    // Get Redis info
    const info = await redis.info('server');
    const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';

    // Close connection
    await redis.quit();

    return NextResponse.json({
      success: true,
      message: 'Redis connection successful',
      data: {
        ping: pingResult,
        pingLatency: `${pingLatency}ms`,
        totalLatency: `${totalLatency}ms`,
        redisVersion,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Redis connection failed',
        latency: `${latency}ms`,
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
