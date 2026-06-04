import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublicClient, createAdminClient } from "../lib/supabase";

// Snapshot creds thật (nếu có .env.local nạp sẵn) trước khi test mutate process.env.
const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_REAL_ENV = Boolean(REAL_URL && REAL_ANON && REAL_SERVICE);

type WithWindow = { window?: unknown };

function clearEnv(): void {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function setDummyEnv(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dummy.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-key";
}

test("createPublicClient throws khi thiếu env", () => {
  clearEnv();
  assert.throws(() => createPublicClient(), /NEXT_PUBLIC_SUPABASE/);
});

test("createAdminClient throws khi thiếu env", () => {
  clearEnv();
  assert.throws(
    () => createAdminClient(),
    /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL/,
  );
});

test("createAdminClient throws khi gọi ở client-side (window tồn tại)", () => {
  setDummyEnv();
  (globalThis as WithWindow).window = {};
  try {
    assert.throws(() => createAdminClient(), /chỉ được gọi ở server/);
  } finally {
    delete (globalThis as WithWindow).window;
  }
});

test("createPublicClient trả client dùng được khi có env (không gọi mạng)", () => {
  setDummyEnv();
  const client = createPublicClient();
  assert.equal(typeof client.from, "function");
  assert.equal(typeof client.rpc, "function");
});

test("createAdminClient trả client dùng được ở server khi có env (không gọi mạng)", () => {
  setDummyEnv();
  assert.equal(typeof window, "undefined"); // sanity: đang chạy trong Node
  const client = createAdminClient();
  assert.equal(typeof client.from, "function");
  assert.equal(typeof client.rpc, "function");
});

// Live connectivity — chỉ chạy khi có creds thật (set sau T0-3/T0-4 trong .env.local).
// Môi trường chưa có creds → skip (không fail).
test(
  "admin client kết nối được Supabase (live)",
  { skip: HAS_REAL_ENV ? false : "Chưa có Supabase creds thật trong env" },
  async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = REAL_ANON;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    const client = createAdminClient();
    const { error } = await client.from("venues").select("id").limit(1);
    // Kết nối OK nếu: không lỗi, hoặc lỗi "bảng chưa tồn tại" (round-trip HTTP ổn, schema chưa apply).
    if (error && !/does not exist|find the table|schema cache/i.test(error.message)) {
      throw new Error("Live connect thất bại: " + error.message);
    }
  },
);
