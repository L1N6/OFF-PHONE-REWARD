import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSubQuest } from "../actions/validateSubQuest";
import { createSession } from "../actions/createSession";
import { createAdminClient } from "../lib/supabase";

// ---- OFFLINE: guard UUID (không chạm DB) ----
test("validateSubQuest → INVALID_SESSION khi sessionId sai (offline)", async () => {
  const r = await validateSubQuest("not-a-uuid", { confirmed: true });
  assert.deepEqual(r, { ok: false, error: "INVALID_SESSION" });
});

// ---- LIVE: skip nếu chưa creds / chưa apply function (probe PGRST202) ----
const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_VENUE = process.env.VENUE_ID;
const HAS_REAL = Boolean(REAL_URL && REAL_SERVICE && REAL_VENUE);

const TOKEN_CODE = "0c0c0c0c-0000-4000-8000-0000000000cc";
const TOKEN_PHYS = "0d0d0d0d-0000-4000-8000-0000000000dd";
const MISSING_UUID = "00000000-0000-4000-8000-000000000000";

test(
  "validate_sub_quest live: code_entry sai→đúng→idempotent · physical_action",
  { skip: HAS_REAL ? false : "Chưa có Supabase creds thật trong env" },
  async (t) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    process.env.VENUE_ID = REAL_VENUE;
    const admin = createAdminClient();

    // Probe: function đã apply chưa?
    const probe = await admin.rpc("validate_sub_quest", {
      p_session_id: MISSING_UUID,
      p_venue_id: REAL_VENUE,
      p_answer: null,
      p_confirmed: false,
    });
    if (probe.error) {
      const m = `${probe.error.code ?? ""} ${probe.error.message ?? ""}`;
      if (/PGRST202|Could not find the function|does not exist/i.test(m)) {
        t.skip("validate_sub_quest CHƯA apply lên Supabase — chạy supabase/schema.sql trong SQL Editor rồi chạy lại npm test");
        return;
      }
      assert.fail("probe RPC lỗi bất thường: " + m);
    }

    const clean = (tok: string) =>
      admin.from("focus_sessions").delete().eq("guest_token", tok);
    await clean(TOKEN_CODE);
    await clean(TOKEN_PHYS);
    try {
      // --- code_entry: sai → đúng (trim) → idempotent ---
      const s1 = await createSession(TOKEN_CODE);
      assert.equal(s1.ok, true, "tạo session code ok");
      if (!s1.ok) return;

      const wrong = await validateSubQuest(s1.sessionId, { answer: "0000" });
      assert.deepEqual(wrong, { ok: true, valid: false }, "mã sai → valid:false");

      const right = await validateSubQuest(s1.sessionId, { answer: "  1234 " });
      assert.deepEqual(right, { ok: true, valid: true }, "mã đúng (có khoảng trắng) → valid:true");

      const { data: row1 } = await admin
        .from("focus_sessions")
        .select("sub_quest_passed")
        .eq("id", s1.sessionId)
        .single();
      assert.equal(row1?.sub_quest_passed, true, "DB sub_quest_passed=true sau khi đúng");

      const again = await validateSubQuest(s1.sessionId, { answer: "9999" });
      assert.deepEqual(again, { ok: true, valid: true }, "đã pass → idempotent valid (kể cả mã sai)");

      // --- physical_action: confirmed → valid ---
      const s2 = await createSession(TOKEN_PHYS);
      assert.equal(s2.ok, true, "tạo session physical ok");
      if (!s2.ok) return;

      const phys = await validateSubQuest(s2.sessionId, { confirmed: true });
      assert.deepEqual(phys, { ok: true, valid: true }, "physical confirmed → valid:true");

      const { data: row2 } = await admin
        .from("focus_sessions")
        .select("sub_quest_passed")
        .eq("id", s2.sessionId)
        .single();
      assert.equal(row2?.sub_quest_passed, true, "DB sub_quest_passed=true cho physical");
    } finally {
      await clean(TOKEN_CODE);
      await clean(TOKEN_PHYS);
    }
  },
);
