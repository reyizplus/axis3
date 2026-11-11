/**
 * Axis3 - Database Connection Test
 * Tests PostgreSQL connectivity from Next.js container
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Import pg dynamically to avoid build-time errors if not installed
    const { Pool } = await import('pg');
    
    // Create connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    // Test query: SELECT NOW()
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    const latency = Date.now() - startTime;

    // Close pool
    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].pg_version,
        latency: `${latency}ms`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
