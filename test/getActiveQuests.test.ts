import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdminClient } from "../lib/supabase";

// getActiveQuests gần như toàn bộ logic ở RPC (weekday SQL + strip) → cover bằng:
//  - SQL test isolated (supabase/tests/get_active_quests_test.sql, Docker)
//  - live test dưới đây: xác nhận trả quest + KHÔNG lộ answer_hash trên Supabase thật.
const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_VENUE = process.env.VENUE_ID;
const HAS_REAL = Boolean(REAL_URL && REAL_SERVICE && REAL_VENUE);

test(
  "get_active_quests live: trả quest hôm nay, KHÔNG lộ answer_hash",
  { skip: HAS_REAL ? false : "Chưa có Supabase creds thật trong env" },
  async (t) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    process.env.VENUE_ID = REAL_VENUE;
    const admin = createAdminClient();

    const probe = await admin.rpc("get_active_quests", { p_venue_id: REAL_VENUE });
    if (probe.error) {
      const m = `${probe.error.code ?? ""} ${probe.error.message ?? ""}`;
      if (/PGRST202|Could not find the function|does not exist/i.test(m)) {
        t.skip("get_active_quests CHƯA apply lên Supabase — chạy supabase/schema.sql rồi npm test lại");
        return;
      }
      assert.fail("probe RPC lỗi bất thường: " + m);
    }

    const quests = probe.data as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(quests), "RPC trả mảng");
    assert.ok(quests.length >= 1, "seed có ≥1 quest active hôm nay");
    for (const q of quests) {
      assert.ok(q.type, "quest có type");
      assert.ok(q.title, "quest có title");
      assert.equal(q.answer_hash, undefined, "KHÔNG được lộ answer_hash");
      assert.equal(q.content, undefined, "KHÔNG trả nguyên content");
    }
    assert.ok(
      quests.some((q) => q.type === "code_entry"),
      "có quest code_entry",
    );
  },
);
