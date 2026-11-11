import { NextResponse } from 'next/server';

/**
 * Docker Network Latency Test
 * Tests internal network performance between containers
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    network: {},
    verdict: 'PENDING',
  };

  try {
    // Test 1: PostgreSQL Network Latency
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const pgStart = Date.now();
    const pgResult = await pool.query('SELECT NOW(), version()');
    const pgLatency = Date.now() - pgStart;
    await pool.end();

    results.network.postgres = {
      latency: `${pgLatency}ms`,
      status: pgLatency < 50 ? 'EXCELLENT' : pgLatency < 100 ? 'GOOD' : 'SLOW',
      serverTime: pgResult.rows[0].now,
      version: pgResult.rows[0].version.split(' ')[1],
    };

    // Test 2: Redis Network Latency
    const Redis = (await import('ioredis')).default;
    const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

    const redisStart = Date.now();
    await redis.ping();
    const redisPingLatency = Date.now() - redisStart;

    const redisSetStart = Date.now();
    await redis.set('audit:test', Date.now(), 'EX', 60);
    const redisSetLatency = Date.now() - redisSetStart;

    const redisGetStart = Date.now();
    await redis.get('audit:test');
    const redisGetLatency = Date.now() - redisGetStart;

    await redis.quit();

    results.network.redis = {
      pingLatency: `${redisPingLatency}ms`,
      setLatency: `${redisSetLatency}ms`,
      getLatency: `${redisGetLatency}ms`,
      status:
        redisPingLatency < 10 && redisSetLatency < 10 && redisGetLatency < 10
          ? 'EXCELLENT'
          : 'ACCEPTABLE',
    };

    // Test 3: Memory Usage
    const memUsage = process.memoryUsage();
    results.memory = {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    };

    // Verdict
    const pgGood = pgLatency < 100;
    const redisGood = redisPingLatency < 20;
    results.verdict = pgGood && redisGood ? 'CLEAR' : 'PERFORMANCE ISSUES';

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    results.verdict = 'CRITICAL FAILURE';
    results.error = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(results, { status: 500 });
  }
}
