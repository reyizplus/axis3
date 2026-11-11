import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';
import { detectDeviceType } from '@/lib/utils/device-detection';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/upload',    // Hafta 3 - STL Upload
  '/checkout',  // Hafta 5 - E-commerce
  '/cart',      // Shopping cart
  '/admin',     // Hafta 7 - Admin Panel
];

// Auth routes that should redirect to dashboard if user is already logged in
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify'];

// Routes to exclude from logging (health checks, monitoring, etc.)
const excludedFromLogging = [
  '/api/health',
  '/api/v1/version',
  '/_next',
  '/favicon.ico',
];

/**
 * Get client IP address from request headers
 * Supports various proxy headers (Cloudflare, Vercel, etc.)
 */
function getClientIP(request: NextRequest): string {
  // Try various headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

/**
 * Send activity log to internal API
 */
async function sendActivityLog(pathname: string, user: any | null, ip: string, request: NextRequest) {
  try {
    const baseUrl = request.nextUrl.origin;
    const userAgent = request.headers.get('user-agent') || null;
    const deviceType = detectDeviceType(userAgent);
    if (user) {
      await fetch(`${baseUrl}/api/internal/activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email || '',
          user_name: user.user_metadata?.full_name || user.email || '',
          page_url: pathname,
          ip_address: ip,
          user_agent: userAgent,
          device_type: deviceType,
        }),
      });
    }
    if (!user && ip && ip !== 'unknown') {
      await fetch(`${baseUrl}/api/internal/ip-activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: ip,
          user_id: user?.id || null,
          user_email: user?.email || '',
          user_name: user?.user_metadata?.full_name || user?.email || '',
          page_url: pathname,
          user_agent: userAgent,
          device_type: deviceType,
        }),
      });
    }
  } catch {
    // Silently fail - activity logging is non-critical
  }
}

/**
 * Format log message with timestamp, IP, and user info
 */
function logRequest(pathname: string, user: any | null, ip: string, action?: string) {
  const timestamp = new Date().toISOString();
  const userId = user ? user.id.substring(0, 8) : 'guest';
  const userEmail = user?.email ? ` (${user.email})` : '';
  const actionText = action ? ` → ${action}` : '';

  console.log(`[${timestamp}] ${pathname.replace(/[^\x20-\x7E]/g, '?')} | IP: ${ip} | User: ${userId}${userEmail}${actionText}`);
}

export async function proxy(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Canonical domain redirect: www.axis3.com.tr -> axis3.com.tr
  if (hostname.startsWith('www.') && process.env.NODE_ENV === 'production') {
    const url = request.nextUrl.clone();
    url.hostname = hostname.slice(4);
    return NextResponse.redirect(url, 301);
  }

  // Skip logging for excluded routes (health checks, static files, etc.)
  const shouldSkipLogging = excludedFromLogging.some((route) =>
    pathname.startsWith(route)
  );

  // Update session and get response (with error handling to prevent 502 crashes)
  let response: NextResponse;
  let user: any = null;
  try {
    const result = await updateSession(request, hostname);
    response = result.response;
    user = result.user;
  } catch (error) {
    console.error('[Proxy] updateSession error:', error);
    response = NextResponse.next();
  }

  // Get client IP address
  const clientIP = getClientIP(request);

  // Log request (unless excluded)
  if (!shouldSkipLogging) {
    logRequest(pathname, user, clientIP);
    sendActivityLog(pathname, user, clientIP, request);
  }

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !user) {
    if (!shouldSkipLogging) {
      logRequest(pathname, user, clientIP, 'REDIRECT to /login (unauthorized)');
    }
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if accessing auth routes while authenticated
  if (isAuthRoute && user) {
    if (!shouldSkipLogging) {
      logRequest(pathname, user, clientIP, 'REDIRECT to /dashboard (already authenticated)');
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/ (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder / static image files
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
