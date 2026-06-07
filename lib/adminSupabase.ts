import { createServerClient, createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function url() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL');
  return v;
}
function anon() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return v;
}

// Server context (Server Components, Server Actions, Route Handlers).
// Reads cookies từ next/headers; set/remove dùng try/catch vì Server Components là read-only.
export function createAuthServerClient() {
  const cookieStore = cookies();
  return createServerClient(url(), anon(), {
    cookies: {
      get(name) { return cookieStore.get(name)?.value; },
      set(name, value, options) {
        try { cookieStore.set({ name, value, ...options }); } catch { /* read-only context */ }
      },
      remove(name, options) {
        try { cookieStore.set({ name, value: '', ...options }); } catch { /* read-only context */ }
      },
    },
  });
}

// Browser context (Client Components) — dùng khi cần sub admin UI client-side.
export function createAuthBrowserClient() {
  return createBrowserClient(url(), anon());
}
