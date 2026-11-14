import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
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

// Marketing (tanıtım) sayfaları. Giriş yapmış kullanıcı bu sayfalara gelirse
// doğrudan panele alınır: mağaza, sepet, ödeme, sipariş takibi ve yasal metinler
// herkese açık kalır (ödeme akışı ve footer bağlantıları bozulmasın).
const marketingRoutes = ['/hizmetler', '/hakkimizda', '/malzemeler', '/iletisim', '/blog'];

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

const INTERNAL_API_TIMEOUT_MS = 8000;
const SUPABASE_REST_TIMEOUT_MS = 8000;

/**
 * Internal API adresi (yedek yol).
 *
 * ONEMLI: Prod ortaminda `request.nextUrl.origin` genel adresi (https://axis3.com.tr)
 * dondurur. Container icinden kendi genel adresine istek atmak Cloudflare/nginx/
 * hairpin NAT nedeniyle basarisiz olabiliyordu. Bu yuzden varsayilan olarak loopback
 * kullanilir; INTERNAL_API_BASE_URL ile override edilebilir.
 *
 * NOT: Asil yol artik dogrudan Supabase REST'e yazmaktir (asagiya bakin). Bu
 * fonksiyon sadece servis anahtari tanimli degilse yedek olarak kullanilir.
 */
function getInternalBaseUrl(): string {
  const configured = process.env.INTERNAL_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const port = process.env.PORT || '3000';
  return `http://127.0.0.1:${port}`;
}

async function postInternalLog(path: string, payload: Record<string, unknown>): Promise<void> {
  const baseUrl = getInternalBaseUrl();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(INTERNAL_API_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(
        `[Proxy] Activity log yazilamadi (${response.status}) ${path}${detail ? `: ${detail.slice(0, 200)}` : ''}`
      );
    }
  } catch (error) {
    console.error(
      `[Proxy] Activity log istegi basarisiz ${path}:`,
      error instanceof Error ? error.message : error
    );
  }
}

interface SupabaseRestConfig {
  url: string;
  key: string;
}

/**
 * Aktivite loglarini dogrudan Supabase REST API'sine yazmak icin gereken bilgiler.
 *
 * Neden: proxy'nin kendi API'sine (loopback veya genel adres) HTTP istegi atmasi
 * ortama baglidir (port, host binding, reverse proxy, hairpin NAT...). Prod'da bu
 * istek sessizce basarisiz oldugu icin aktivite kayitlari hic olusmuyordu.
 * Servis anahtari ile REST cagrisi bu bagimliligi tamamen kaldirir.
 */
function getSupabaseRestConfig(): SupabaseRestConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

async function insertRow(
  config: SupabaseRestConfig,
  table: 'user_activity_logs' | 'ip_activity_logs' | 'audit_logs',
  row: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(`${config.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      cache: 'no-store',
      signal: AbortSignal.timeout(SUPABASE_REST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(
        `[Proxy] ${table} kaydi yazilamadi (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`
      );
    }
  } catch (error) {
    console.error(
      `[Proxy] ${table} kaydi basarisiz:`,
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Send activity log. Servis anahtari varsa dogrudan veritabanina yazilir;
 * yoksa internal API yoluna dusulur.
 */
async function sendActivityLog(pathname: string, user: any | null, ip: string, request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || null;
  const deviceType = detectDeviceType(userAgent);
  const resolvedIP = ip && ip !== 'unknown' ? ip : null;
  const config = getSupabaseRestConfig();

  if (user) {
    if (!config) {
      await postInternalLog('/api/internal/activity-log', {
        user_id: user.id,
        user_email: user.email || '',
        user_name: user.user_metadata?.full_name || user.email || '',
        page_url: pathname,
        ip_address: ip,
        user_agent: userAgent,
        device_type: deviceType,
      });
      return;
    }

    await Promise.allSettled([
      insertRow(config, 'user_activity_logs', {
        user_id: user.id,
        ip_address: resolvedIP,
        user_agent: userAgent,
        device_type: deviceType,
        page_url: pathname,
      }),
      insertRow(config, 'audit_logs', {
        user_id: user.id,
        action: 'page_view',
        entity_type: 'page',
        entity_id: pathname,
        ip_address: resolvedIP,
        user_agent: userAgent,
      }),
    ]);
    return;
  }

  if (!resolvedIP) return;

  if (!config) {
    await postInternalLog('/api/internal/ip-activity-log', {
      ip_address: resolvedIP,
      user_id: null,
      user_email: '',
      user_name: '',
      page_url: pathname,
      user_agent: userAgent,
      device_type: deviceType,
    });
    return;
  }

  await insertRow(config, 'ip_activity_logs', {
    ip_address: resolvedIP,
    user_id: null,
    user_agent: userAgent,
    device_type: deviceType,
    page_url: pathname,
  });
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

/**
 * Yönlendirme yanıtı üretirken `updateSession`'ın tazelediği oturum çerezlerini
 * taşır. Çerezler kopyalanmazsa tarayıcı eski (süresi geçmiş) token ile devam
 * eder ve kullanıcı bir sonraki istekte oturumunu kaybetmiş gibi görünür.
 */
function redirectWithSession(url: URL, sessionResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

/**
 * Blocked IP enforcement.
 *
 * `blocked_ips` was previously only a table admins could edit — nothing read
 * it, so "blocking" an IP had no effect. The list is fetched through the
 * Supabase REST API (the proxy runs on the edge and cannot use the Supabase
 * SDK) and cached in module scope for a short time so we do not query the
 * database on every request.
 */
const BLOCKED_IP_CACHE_TTL_MS = 60_000;
const BLOCKED_IP_TIMEOUT_MS = 3_000;

interface BlockedIpRow {
  ip_address: string;
  expires_at: string | null;
}

let blockedIpCache: { ips: Set<string>; fetchedAt: number } | null = null;
let blockedIpInFlight: Promise<Set<string> | null> | null = null;

async function fetchBlockedIps(config: SupabaseRestConfig): Promise<Set<string> | null> {
  try {
    const response = await fetch(
      `${config.url}/rest/v1/blocked_ips?select=ip_address,expires_at&is_active=eq.true`,
      {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(BLOCKED_IP_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      console.error(`[Proxy] blocked_ips okunamadi (${response.status})`);
      return null;
    }

    const rows = (await response.json()) as BlockedIpRow[];
    const now = Date.now();

    return new Set(
      rows
        .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
        .map((row) => row.ip_address)
    );
  } catch (error) {
    console.error(
      '[Proxy] blocked_ips istegi basarisiz:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function isBlockedIp(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false;

  const config = getSupabaseRestConfig();
  if (!config) return false;

  const now = Date.now();
  const cacheFresh = blockedIpCache && now - blockedIpCache.fetchedAt < BLOCKED_IP_CACHE_TTL_MS;

  if (!cacheFresh) {
    if (!blockedIpInFlight) {
      blockedIpInFlight = fetchBlockedIps(config).finally(() => {
        blockedIpInFlight = null;
      });
    }

    const ips = await blockedIpInFlight;
    // On failure keep the previous list (and retry in a minute) instead of
    // unblocking everyone or hammering the database with a lookup per request.
    blockedIpCache = {
      ips: ips ?? blockedIpCache?.ips ?? new Set<string>(),
      fetchedAt: Date.now(),
    };
  }

  return blockedIpCache?.ips.has(ip) ?? false;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname, hostname } = request.nextUrl;

  // Get client IP address
  const clientIP = getClientIP(request);

  // Enforce the admin-managed block list before doing anything else.
  if (await isBlockedIp(clientIP)) {
    console.warn(`[Proxy] Blocked IP rejected: ${clientIP} ${pathname}`);
    return new NextResponse('Erisiminiz engellendi.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  // API routes are not covered by the session-refresh flow (see matcher).
  // Enforce the block list there too, then leave them untouched.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

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

  // Log request (unless excluded)
  if (!shouldSkipLogging) {
    logRequest(pathname, user, clientIP);
    // waitUntil: yanit dondukten sonra da log yazimi tamamlanir.
    // (Fire-and-forget prod'da istegin yarida kesilmesine yol acabiliyordu.)
    const activityTask = sendActivityLog(pathname, user, clientIP, request);
    try {
      event.waitUntil(activityTask);
    } catch {
      // waitUntil desteklenmiyorsa arka planda devam etsin.
      void activityTask;
    }
  }

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Ana sayfa ve pazarlama sayfaları: giriş yapmış kullanıcı doğrudan panele gider.
  const isMarketingRoute =
    pathname === '/' ||
    marketingRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isMarketingRoute && user) {
    if (!shouldSkipLogging) {
      logRequest(pathname, user, clientIP, 'REDIRECT to /dashboard (authenticated visitor)');
    }
    return redirectWithSession(new URL('/dashboard', request.url), response);
  }

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !user) {
    if (!shouldSkipLogging) {
      logRequest(pathname, user, clientIP, 'REDIRECT to /login (unauthorized)');
    }
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return redirectWithSession(redirectUrl, response);
  }

  // Redirect to dashboard if accessing auth routes while authenticated
  if (isAuthRoute && user) {
    if (!shouldSkipLogging) {
      logRequest(pathname, user, clientIP, 'REDIRECT to /dashboard (already authenticated)');
    }
    return redirectWithSession(new URL('/dashboard', request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder / static image files
     *
     * API routes are included so the blocked-IP list is enforced there too;
     * the proxy returns before the session-refresh flow for them.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
