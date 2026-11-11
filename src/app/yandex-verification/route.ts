/**
 * Yandex Webmaster Verification Route
 * 
 * Serves the Yandex verification HTML page for site ownership verification.
 * The verification ID is read from environment variables.
 * 
 * URL: https://axis3.com.tr/yandex-verification
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

/**
 * GET /yandex-verification
 * Returns HTML page with Yandex verification code
 */
export async function GET() {
  // Get verification ID from environment variable
  const verificationId = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION;

  // If no verification ID is set, return 404
  if (!verificationId) {
    return new NextResponse('Yandex verification not configured', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // Generate HTML response with verification code
  const html = `<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>Verification: ${verificationId}</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
