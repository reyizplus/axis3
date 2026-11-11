import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

const supabaseFetch: typeof fetch = async (input, init) => {
  try {
    const response = await fetch(input, init);
    return response;
  } catch {
    return new Response(JSON.stringify({ error: 'Network error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      auth: { lockAcquireTimeout: 15000 },
    } as any
  );
}

export async function getSession() {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    return null;
  }

  return session;
}

export async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
