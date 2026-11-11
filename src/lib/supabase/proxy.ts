import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';

/**
 * Extract parent domain from hostname for cookie sharing across subdomains.
 * Returns undefined for localhost/development.
 */
function getCookieDomain(hostname: string): string | undefined {
  if (hostname === 'localhost' || hostname.startsWith('localhost:') || hostname === '127.0.0.1') {
    return undefined;
  }
  // www is already redirected to non-www in proxy.ts before updateSession is called,
  // so this always gets the bare domain (e.g. axis3.com.tr -> .axis3.com.tr)
  return '.' + hostname;
}

export async function updateSession(request: NextRequest, hostname?: string) {
  const resolvedHostname = hostname || request.nextUrl.hostname;
  const cookieDomain = getCookieDomain(resolvedHostname);

  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
            });
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  let user = null;
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) {
      // Silent fail for invalid/expired refresh tokens - clear cookies instead of crashing
      if (error.code === 'refresh_token_not_found' || error.message?.includes('Invalid Refresh Token')) {
        const expiredCookies = request.cookies.getAll()
          .filter(c => c.name.startsWith('sb-') || c.name.startsWith('supabase-'));
        for (const c of expiredCookies) {
          response.cookies.set(c.name, '', { maxAge: 0, path: '/', domain: cookieDomain });
        }
      }
    } else {
      user = authUser;
    }
  } catch (e) {
    const msg = (e as Error).message;
    if (!msg?.includes('refresh_token_not_found') && !msg?.includes('Invalid Refresh Token')) {
      console.error('[Supabase Proxy] Auth getUser failed:', msg);
    }
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return { response, user };
}
