import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client factories.
 *
 * Hai client tách bạch:
 *  - `createPublicClient()` — anon key, an toàn dùng ở FE (browser).
 *  - `createAdminClient()`  — service_role key, CHỈ dùng trong Server Actions / API routes.
 *
 * Lưu ý "pooler 6543" (specs.md §0.3, todo T0-2):
 *   `@supabase/supabase-js` nói chuyện với Postgres qua PostgREST over HTTPS — nó chỉ cần
 *   URL + key, KHÔNG nhận connection-string hay port. Pooler transaction-mode (Supavisor,
 *   port 6543) chỉ liên quan tới kết nối Postgres TRỰC TIẾP (pg/Prisma/migrations). Vì vậy
 *   yêu cầu "pooler-safe" được thoả ở supabase-js qua Invariant #2: logic đa-bước-nguyên-tử
 *   = 1 RPC (`.rpc('claim_voucher', ...)`), KHÔNG BEGIN/COMMIT trải nhiều query từ Node.
 *   Nếu sau này thêm kết nối Postgres trực tiếp (migrations/seed script), connection string
 *   ĐÓ phải trỏ port 6543 (pooler), không phải 5432 (direct).
 */

// Không dùng Supabase Auth (Invariant #3 NO AUTH): không cần persist/refresh session.
const NO_SESSION = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/**
 * Public client (anon key) — dùng ở FE. RLS sẽ áp dụng khi bật ở Fast-follow (specs.md §5).
 * Env đọc ở thời điểm gọi (runtime) để chạy đúng trên Vercel serverless và dễ test.
 */
export function createPublicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY — kiểm tra .env.local",
    );
  }
  return createClient(url, anonKey, NO_SESSION);
}

/**
 * Admin client (service_role key) — bypass RLS, CHỈ chạy ở server.
 * Throw nếu lỡ gọi từ client-side để service_role key không bao giờ rò ra browser.
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() chỉ được gọi ở server (Server Action / API route), không bao giờ ở client.",
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY — kiểm tra .env.local",
    );
  }
  return createClient(url, serviceKey, NO_SESSION);
}
