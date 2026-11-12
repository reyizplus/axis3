/**
 * Axis3 - Supabase Server Client
 * 
 * Server-side Supabase client for use in Server Components and API Routes.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { Database } from '@/types/database';
import { getSupabaseCookieOptions } from './cookie-options';

/**
 * Create a Supabase client for use in Server Components
 */
export async function createClient() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();

  // Proxy (middleware) ve browser istemcisiyle aynı çerez seçenekleri:
  // prod'da `.axis3.com.tr` + HTTPS'te `secure`, yerelde host-only.
  const cookieOptions = getSupabaseCookieOptions({
    hostname: requestHeaders.get('host'),
    forwardedProto: requestHeaders.get('x-forwarded-proto'),
  });

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Handle cookie setting errors in middleware
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase client with service role key (admin access)
 * Use with caution - only in secure server-side contexts
 */
export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for service client
        },
      },
    },
  );
}
