import { test } from "node:test";
import assert from "node:assert/strict";
import { claimVoucher } from "../actions/claimVoucher";
import { createSession } from "../actions/createSession";
import { createAdminClient } from "../lib/supabase";

// Snapshot creds thật trước khi test khác mutate process.env.
const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_VENUE = process.env.VENUE_ID;
const HAS_REAL = Boolean(REAL_URL && REAL_SERVICE && REAL_VENUE);

// Token test namespaced → an toàn dọn sạch (session + nhả voucher) sau test.
const TEST_TOKEN = "0f0f0f0f-0000-4000-8000-0000000000ff";

test("claimVoucher → INVALID_SESSION khi sessionId sai (offline, không chạm DB)", async () => {
  const r = await claimVoucher("not-a-uuid", { bypassCode: "x" });
  assert.deepEqual(r, { ok: false, error: "INVALID_SESSION" });
});

// Live: RACE 2 request đồng thời cùng session → ĐÚNG 1 voucher (Invariant #6/#8).
// Cần creds thật + create_session/claim_voucher đã apply. Tự nhả voucher + xoá session (finally).
test(
  "claimVoucher live: race 2 request đồng thời cùng session → đúng 1 voucher",
  { skip: HAS_REAL ? false : "Chưa có Supabase creds thật trong env" },
  async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    process.env.VENUE_ID = REAL_VENUE;

    const admin = createAdminClient();

    // Dọn: nhả voucher của session test TRƯỚC rồi xoá session (vouchers.session_id ON DELETE SET NULL
    // → phải reset status thủ công, không thì voucher kẹt RESERVED ngoài pool).
    const cleanup = async () => {
      const { data: ss } = await admin
        .from("focus_sessions")
        .select("id")
        .eq("guest_token", TEST_TOKEN);
      const ids = (ss ?? []).map((s: { id: string }) => s.id);
      if (ids.length) {
        await admin
          .from("vouchers")
          .update({
            status: "AVAILABLE",
            session_id: null,
            assigned_at: null,
            expires_at: null,
          })
          .in("session_id", ids);
      }
      await admin.from("focus_sessions").delete().eq("guest_token", TEST_TOKEN);
    };

    await cleanup();
    try {
      // Toạ độ venue → presence GPS distance 0 ≤ radius (khỏi phụ thuộc CASHIER_BYPASS_CODE).
      const { data: venue, error: vErr } = await admin
        .from("venues")
        .select("latitude, longitude")
        .eq("id", REAL_VENUE)
        .single();
      assert.equal(vErr, null, "đọc venue không lỗi");

      // Tạo phiên + đưa vào trạng thái claimable (pass quest + lùi start_time vào Giờ Vàng 45–48').
      const created = await createSession(TEST_TOKEN);
      assert.equal(created.ok, true, "tạo phiên test phải ok");
      if (!created.ok) return;
      const backdated = new Date(Date.now() - 2750 * 1000).toISOString(); // ~45'50"
      const { error: uErr } = await admin
        .from("focus_sessions")
        .update({ sub_quest_passed: true, start_time: backdated })
        .eq("id", created.sessionId);
      assert.equal(uErr, null, "set claimable không lỗi");

      // RACE: 2 claim đồng thời cùng session.
      const presence = { lat: venue.latitude, lng: venue.longitude };
      const [a, b] = await Promise.all([
        claimVoucher(created.sessionId, presence),
        claimVoucher(created.sessionId, presence),
      ]);
      assert.equal(a.ok, true, "A phải ok: " + JSON.stringify(a));
      assert.equal(b.ok, true, "B phải ok: " + JSON.stringify(b));
      if (a.ok && b.ok) {
        assert.equal(a.code, b.code, "2 request đồng thời phải trả CÙNG 1 code (idempotent)");
      }

      // DB: đúng 1 voucher cho session (uniq_voucher_per_session).
      const { count, error: cErr } = await admin
        .from("vouchers")
        .select("*", { count: "exact", head: true })
        .eq("session_id", created.sessionId);
      assert.equal(cErr, null, "đếm voucher không lỗi");
      assert.equal(count, 1, "chỉ được đúng 1 voucher / session");

      // Session → COMPLETED.
      const { data: sRow, error: sErr } = await admin
        .from("focus_sessions")
        .select("status")
        .eq("id", created.sessionId)
        .single();
      assert.equal(sErr, null);
      assert.equal(sRow.status, "COMPLETED", "claim xong → session COMPLETED");

      // Claim lại (idempotent) → cùng code, không cấp thêm.
      const again = await claimVoucher(created.sessionId, presence);
      assert.equal(again.ok, true, "claim lại vẫn ok (idempotent)");
      if (again.ok && a.ok) assert.equal(again.code, a.code, "idempotent trả code cũ");
    } finally {
      await cleanup();
    }
  },
);
