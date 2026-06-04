import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../actions/createSession";
import { createAdminClient } from "../lib/supabase";

// log_infraction gần như toàn bộ ở RPC → cover bằng SQL test (Docker) + live dưới đây.
const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_VENUE = process.env.VENUE_ID;
const HAS_REAL = Boolean(REAL_URL && REAL_SERVICE && REAL_VENUE);

const TOKEN = "0e0e0e0e-0000-4000-8000-0000000000ee";
const MISSING_UUID = "00000000-0000-4000-8000-000000000000";

test(
  "log_infraction live: increment RUNNING (1→2) · -1 khi không tồn tại",
  { skip: HAS_REAL ? false : "Chưa có Supabase creds thật trong env" },
  async (t) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    process.env.VENUE_ID = REAL_VENUE;
    const admin = createAdminClient();

    const probe = await admin.rpc("log_infraction", { p_session_id: MISSING_UUID });
    if (probe.error) {
      const m = `${probe.error.code ?? ""} ${probe.error.message ?? ""}`;
      if (/PGRST202|Could not find the function|does not exist/i.test(m)) {
        t.skip("log_infraction CHƯA apply lên Supabase — chạy supabase/schema.sql rồi npm test lại");
        return;
      }
      assert.fail("probe RPC lỗi bất thường: " + m);
    }
    assert.equal(probe.data, -1, "session không tồn tại → -1");

    const clean = () =>
      admin.from("focus_sessions").delete().eq("guest_token", TOKEN);
    await clean();
    try {
      const s = await createSession(TOKEN);
      assert.equal(s.ok, true, "tạo session test ok");
      if (!s.ok) return;

      const r1 = await admin.rpc("log_infraction", { p_session_id: s.sessionId });
      assert.equal(r1.error, null);
      assert.equal(r1.data, 1, "lần 1 → 1");

      const r2 = await admin.rpc("log_infraction", { p_session_id: s.sessionId });
      assert.equal(r2.data, 2, "lần 2 → 2");

      const { data: row } = await admin
        .from("focus_sessions")
        .select("infraction_count")
        .eq("id", s.sessionId)
        .single();
      assert.equal(row?.infraction_count, 2, "DB infraction_count = 2");
    } finally {
      await clean();
    }
  },
);
