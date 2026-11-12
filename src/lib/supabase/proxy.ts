import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';
import { getSupabaseCookieOptions } from './cookie-options';

export async function updateSession(request: NextRequest, hostname?: string) {
  const resolvedHostname = hostname || request.nextUrl.hostname;

  // Browser/server istemcileriyle aynı domain/secure/path seçenekleri kullanılır;
  // aksi halde prod'da aynı adlı iki auth çerezi oluşup oturum kaybolabiliyordu.
  const cookieOptions = getSupabaseCookieOptions({
    hostname: resolvedHostname,
    protocol: request.nextUrl.protocol,
    forwardedProto: request.headers.get('x-forwarded-proto'),
  });

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
      cookieOptions,
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
            response.cookies.set(name, value, options);
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
          response.cookies.set(c.name, '', { ...cookieOptions, maxAge: 0 });
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
