import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidUuid } from "../lib/uuid";
import { createSession } from "../actions/createSession";
import { createAdminClient } from "../lib/supabase";

// Snapshot creds thật (nạp từ .env.local qua --env-file-if-exists) trước khi bất kỳ test nào
// khác có thể mutate process.env → live test khôi phục lại trước khi gọi.
const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_VENUE = process.env.VENUE_ID;
const HAS_REAL = Boolean(REAL_URL && REAL_SERVICE && REAL_VENUE);

// Token test có namespace (UUID v4 hợp lệ, không đụng guest thật) → an toàn xoá sạch sau test.
const TEST_TOKEN = "0a0a0a0a-0000-4000-8000-0000000000aa";

test("isValidUuid chấp nhận UUID hợp lệ (thường + HOA)", () => {
  assert.equal(isValidUuid("11111111-1111-1111-1111-111111111111"), true);
  assert.equal(isValidUuid("a1b2c3d4-e5f6-4789-ab12-1234567890ab"), true);
  assert.equal(isValidUuid("A1B2C3D4-E5F6-4789-AB12-1234567890AB"), true);
});

test("isValidUuid từ chối chuỗi sai/độc", () => {
  assert.equal(isValidUuid(""), false);
  assert.equal(isValidUuid("not-a-uuid"), false);
  assert.equal(isValidUuid("11111111-1111-1111-1111-11111111111"), false); // thiếu 1 ký tự
  assert.equal(isValidUuid("11111111111111111111111111111111"), false); // không có dấu -
  assert.equal(isValidUuid("'; DROP TABLE focus_sessions; --"), false); // injection-ish
});

test("createSession → INVALID_TOKEN khi guest_token sai (offline, không chạm DB)", async () => {
  const r = await createSession("not-a-uuid");
  assert.deepEqual(r, { ok: false, error: "INVALID_TOKEN" });
});

// Live: race idempotent + resume + rate-limit. Cần creds thật + function create_session đã apply.
// Tự cleanup token test trước & sau (finally) → không để rác trong DB pilot.
test(
  "createSession live: race 2 request → 1 session · resume · rate-limit",
  { skip: HAS_REAL ? false : "Chưa có Supabase creds thật trong env" },
  async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    process.env.VENUE_ID = REAL_VENUE;

    const admin = createAdminClient();
    const cleanup = () =>
      admin.from("focus_sessions").delete().eq("guest_token", TEST_TOKEN);

    await cleanup(); // dọn rác từ lần chạy trước (nếu có)
    try {
      // 1) Race: 2 createSession đồng thời → đúng 1 session_id (idempotency tầng DB)
      const [a, b] = await Promise.all([
        createSession(TEST_TOKEN),
        createSession(TEST_TOKEN),
      ]);
      assert.equal(a.ok, true, "request A phải ok");
      assert.equal(b.ok, true, "request B phải ok");
      if (a.ok && b.ok) {
        assert.equal(a.sessionId, b.sessionId, "2 request đồng thời phải cùng session");
      }

      // 2) DB chỉ có đúng 1 phiên RUNNING cho token này
      const { count, error: cErr } = await admin
        .from("focus_sessions")
        .select("*", { count: "exact", head: true })
        .eq("guest_token", TEST_TOKEN)
        .eq("status", "RUNNING");
      assert.equal(cErr, null, "đếm RUNNING không lỗi");
      assert.equal(count, 1, "chỉ được đúng 1 phiên RUNNING");

      // 3) Resume: gọi lại khi vẫn RUNNING → cùng id + resumed=true
      const c = await createSession(TEST_TOKEN);
      assert.equal(c.ok, true);
      if (c.ok && a.ok) {
        assert.equal(c.sessionId, a.sessionId, "resume phải trả phiên cũ");
        assert.equal(c.resumed, true, "resumed=true");
      }

      // 4) Rate-limit: đánh dấu phiên COMPLETED hôm nay → createSession kế → RATE_LIMITED
      const { error: uErr } = await admin
        .from("focus_sessions")
        .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
        .eq("guest_token", TEST_TOKEN)
        .eq("status", "RUNNING");
      assert.equal(uErr, null, "update COMPLETED không lỗi");

      const d = await createSession(TEST_TOKEN);
      assert.equal(d.ok, false, "đã hoàn thành hôm nay → phải bị chặn");
      if (!d.ok) assert.equal(d.error, "RATE_LIMITED");
    } finally {
      await cleanup(); // luôn dọn sạch token test
    }
  },
);
