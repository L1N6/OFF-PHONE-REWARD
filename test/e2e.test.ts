import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../actions/createSession";
import { validateSubQuest } from "../actions/validateSubQuest";
import { claimVoucher } from "../actions/claimVoucher";
import { validateVoucher } from "../actions/validateVoucher";
import { createAdminClient } from "../lib/supabase";

// =====================================================================
// SMOKE E2E (live) — specs §4 toàn luồng (T5-4):
//   START → Blind Box (sai→đúng) → claim (GPS) → voucher → POS redeem + chống double-redeem.
// Chạy thật qua Server Actions + Supabase. Skip nếu chưa có creds. Phần REDEEM chỉ chạy nếu
// `validate_voucher` đã apply (probe) — chưa apply thì diagnostic, KHÔNG fail (chain claim vẫn verify).
// =====================================================================
const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_VENUE = process.env.VENUE_ID;
const HAS_REAL = Boolean(REAL_URL && REAL_SERVICE && REAL_VENUE);

const E2E_TOKEN = "0e2e0e2e-0000-4000-8000-00000000e2ee";

test(
  "E2E smoke (live): START → Blind Box → claim → voucher → POS redeem + double-block",
  { skip: HAS_REAL ? false : "Chưa có Supabase creds thật trong env" },
  async (t) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    process.env.VENUE_ID = REAL_VENUE;
    const admin = createAdminClient();

    // Cleanup: nhả voucher của session test (reset full) rồi xoá session.
    const cleanup = async () => {
      const { data: ss } = await admin
        .from("focus_sessions")
        .select("id")
        .eq("guest_token", E2E_TOKEN);
      const ids = (ss ?? []).map((s: { id: string }) => s.id);
      if (ids.length) {
        await admin
          .from("vouchers")
          .update({
            status: "AVAILABLE",
            session_id: null,
            assigned_at: null,
            expires_at: null,
            redeemed_at: null,
          })
          .in("session_id", ids);
      }
      await admin.from("focus_sessions").delete().eq("guest_token", E2E_TOKEN);
    };

    await cleanup();
    try {
      // 1) START → session RUNNING trong DB.
      const created = await createSession(E2E_TOKEN);
      assert.equal(created.ok, true, "START tạo phiên ok");
      if (!created.ok) return;
      const sid = created.sessionId;

      // 2) Blind Box: mã SAI → valid:false (thử lại được).
      const wrong = await validateSubQuest(sid, { answer: "0000" });
      assert.equal(wrong.ok && wrong.valid === false, true, "mã sai → valid:false");

      // 2b) Blind Box: mã ĐÚNG "1234" (seed) → valid:true + sub_quest_passed.
      const right = await validateSubQuest(sid, { answer: "1234" });
      assert.equal(right.ok && right.valid === true, true, "mã đúng → valid:true");
      const { data: srow } = await admin
        .from("focus_sessions")
        .select("sub_quest_passed")
        .eq("id", sid)
        .single();
      assert.equal(srow?.sub_quest_passed, true, "DB sub_quest_passed=true");

      // 3) Đưa vào Giờ Vàng (45–48') để claim được.
      const backdated = new Date(Date.now() - 2750 * 1000).toISOString();
      const { error: uErr } = await admin
        .from("focus_sessions")
        .update({ start_time: backdated })
        .eq("id", sid);
      assert.equal(uErr, null, "backdate start_time ok");

      // 4) Claim bằng GPS tại toạ độ venue → voucher code.
      const { data: venue } = await admin
        .from("venues")
        .select("latitude, longitude")
        .eq("id", REAL_VENUE)
        .single();
      assert.ok(venue, "đọc venue ok");
      if (!venue) return;
      const claim = await claimVoucher(sid, {
        lat: venue.latitude,
        lng: venue.longitude,
      });
      assert.equal(claim.ok, true, "claim ok: " + JSON.stringify(claim));
      if (!claim.ok) return;
      assert.match(claim.code, /^OPR-/, "voucher code dạng OPR-…: " + claim.code);

      // 5) POS redeem — chỉ chạy nếu validate_voucher đã apply.
      const probe = await admin.rpc("validate_voucher", {
        p_code: "__PROBE__",
        p_venue_id: REAL_VENUE,
      });
      const vvMissing =
        probe.error &&
        /PGRST202|Could not find the function|does not exist/i.test(
          `${probe.error.code ?? ""} ${probe.error.message ?? ""}`,
        );
      if (vvMissing) {
        t.diagnostic("validate_voucher CHƯA apply — bỏ qua bước POS redeem (chain claim đã verify).");
        return;
      }

      const v1 = await validateVoucher(claim.code);
      assert.equal(v1.ok && v1.status === "VALID", true, "POS validate lần 1 → VALID");
      const v2 = await validateVoucher(claim.code);
      assert.equal(v2.ok && v2.status === "USED", true, "POS validate lần 2 → USED (double-redeem block)");
    } finally {
      await cleanup();
    }
  },
);
