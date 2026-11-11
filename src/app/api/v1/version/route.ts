/**
 * Axis3 - Version Endpoint
 *
 * Returns application version and build information.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    application: 'AXIS3',
    version: '0.1.0',
    buildDate: new Date().toISOString(),
    nextVersion: '16.2.4',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  });
}
