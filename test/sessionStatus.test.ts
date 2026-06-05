import { test } from "node:test";
import assert from "node:assert/strict";
import {
  derivePhase,
  deriveSessionStatus,
  deriveClaimView,
  computeLiveDelta,
  formatMMSS,
  reconcileStartEpoch,
  elapsedSince,
  CLAIM_OPEN,
  CLAIM_CLOSE,
} from "../lib/sessionStatus";
import { createAdminClient } from "../lib/supabase";
import { createSession } from "../actions/createSession";

// =====================================================================
// OFFLINE — phase machine pure (specs §4 Module 2). Không cần DB.
// =====================================================================

test("derivePhase map đúng MỌI biên (specs §4 Module 2)", () => {
  assert.equal(derivePhase(0), 1);
  assert.equal(derivePhase(899), 1);
  assert.equal(derivePhase(900), 2); // mở phase 2
  assert.equal(derivePhase(2099), 2);
  assert.equal(derivePhase(2100), 3); // mở phase 3
  assert.equal(derivePhase(2699), 3);
  assert.equal(derivePhase(2700), "CLAIMABLE"); // mở Giờ Vàng
  assert.equal(derivePhase(2880), "CLAIMABLE"); // còn trong Giờ Vàng
  assert.equal(derivePhase(2881), "EXPIRED"); // quá 48'
  assert.equal(derivePhase(99999), "EXPIRED");
});

test("deriveSessionStatus: phiên mới (phase 1) — chưa cho claim", () => {
  const s = deriveSessionStatus(100, "RUNNING", false);
  assert.equal(s.phase, 1);
  assert.equal(s.delta_seconds, 100);
  assert.equal(s.status, "RUNNING");
  assert.equal(s.claim_window_open, false);
  assert.equal(s.claim_window_expired, false);
});

test("deriveSessionStatus: trong Giờ Vàng + RUNNING → claim_window_open=true", () => {
  const s = deriveSessionStatus(2750, "RUNNING", true);
  assert.equal(s.phase, "CLAIMABLE");
  assert.equal(s.claim_window_open, true);
  assert.equal(s.claim_window_expired, false);
  assert.equal(s.sub_quest_passed, true);
});

test("deriveSessionStatus: biên Giờ Vàng — 2700 & 2880 mở, 2699 & 2881 đóng", () => {
  assert.equal(deriveSessionStatus(CLAIM_OPEN, "RUNNING", true).claim_window_open, true);
  assert.equal(deriveSessionStatus(CLAIM_CLOSE, "RUNNING", true).claim_window_open, true);
  assert.equal(deriveSessionStatus(CLAIM_OPEN - 1, "RUNNING", true).claim_window_open, false);
  assert.equal(deriveSessionStatus(CLAIM_CLOSE + 1, "RUNNING", true).claim_window_open, false);
});

test("deriveSessionStatus: đã COMPLETED trong window → KHÔNG mở claim lại (status gate)", () => {
  const s = deriveSessionStatus(2750, "COMPLETED", true);
  assert.equal(s.claim_window_open, false);
  assert.equal(s.phase, "CLAIMABLE"); // phase theo Δt; nhưng không cho claim vì đã xong
});

test("deriveSessionStatus: quá 48' → EXPIRED, claim đóng + expired=true", () => {
  const s = deriveSessionStatus(3000, "EXPIRED", false);
  assert.equal(s.phase, "EXPIRED");
  assert.equal(s.claim_window_open, false);
  assert.equal(s.claim_window_expired, true);
});

// --- T3-1: deriveClaimView (logic hiển thị nút CLAIM) ---

test("deriveClaimView: trong Giờ Vàng + đã pass quest → CLAIM", () => {
  const s = deriveSessionStatus(2750, "RUNNING", true);
  assert.equal(deriveClaimView(s, true), "CLAIM");
});

test("deriveClaimView: trong Giờ Vàng nhưng CHƯA pass quest → NEED_QUEST", () => {
  const s = deriveSessionStatus(2750, "RUNNING", false);
  assert.equal(deriveClaimView(s, false), "NEED_QUEST");
});

test("deriveClaimView: optimistic passed (server false, localPassed true) → CLAIM", () => {
  const s = deriveSessionStatus(2750, "RUNNING", false); // server chưa thấy pass
  assert.equal(deriveClaimView(s, true), "CLAIM"); // effective passed override
});

test("deriveClaimView: quá 48' → EXPIRED (ưu tiên hơn open/passed)", () => {
  const s = deriveSessionStatus(3000, "EXPIRED", true);
  assert.equal(deriveClaimView(s, true), "EXPIRED");
});

test("deriveClaimView: chưa tới Giờ Vàng (phase 1/2/3) → NONE", () => {
  assert.equal(deriveClaimView(deriveSessionStatus(100, "RUNNING", false), false), "NONE");
  assert.equal(deriveClaimView(deriveSessionStatus(2000, "RUNNING", true), true), "NONE");
});

test("deriveClaimView: đã COMPLETED trong window → NONE (status gate đóng claim_window_open)", () => {
  const s = deriveSessionStatus(2750, "COMPLETED", true);
  assert.equal(deriveClaimView(s, true), "NONE");
});

test("computeLiveDelta: cộng thời gian trôi kể từ fetch (giây)", () => {
  assert.equal(computeLiveDelta(1000, 5000, 8000), 1003); // +3s
  assert.equal(computeLiveDelta(1000, 5000, 5000), 1000); // vừa fetch
  assert.equal(computeLiveDelta(0, 10000, 10500), 0.5); // nửa giây
});

test("formatMMSS: MM:SS zero-pad, clamp âm về 00:00", () => {
  assert.equal(formatMMSS(0), "00:00");
  assert.equal(formatMMSS(5), "00:05");
  assert.equal(formatMMSS(65), "01:05");
  assert.equal(formatMMSS(CLAIM_OPEN), "45:00"); // mốc Giờ Vàng
  assert.equal(formatMMSS(CLAIM_CLOSE), "48:00");
  assert.equal(formatMMSS(-5), "00:00"); // âm (đã quá mốc) → 00:00
});

test("reconcileStartEpoch: lần đầu (null) → lấy candidate (fetchTime - serverDelta*1000)", () => {
  assert.equal(reconcileStartEpoch(null, 100, 100_000), 0); // 100000 - 100*1000
  assert.equal(reconcileStartEpoch(null, 0, 50_000), 50_000);
});

test("reconcileStartEpoch: lệch nhỏ <5s → EASE (không snap)", () => {
  // prev=0, candidate = 101000-100000 = 1000 (drift 1000ms < 5000) → ease 0.34 → 340
  assert.equal(reconcileStartEpoch(0, 100, 101_000, 5000, 0.34), 340);
  // drift âm cũng ease
  assert.equal(reconcileStartEpoch(1000, 100, 100_000, 5000, 0.5), 500); // candidate 0, drift -1000 → 1000-500
});

test("reconcileStartEpoch: lệch lớn ≥5s → SNAP về candidate", () => {
  // prev=0, candidate = 110000-100000 = 10000 (drift 10000 ≥ 5000) → snap 10000
  assert.equal(reconcileStartEpoch(0, 100, 110_000), 10_000);
  assert.equal(reconcileStartEpoch(0, 100, 95_000), -5000); // drift -5000 (≥5000) → snap candidate
});

test("elapsedSince: giây trôi từ mốc bắt đầu", () => {
  assert.equal(elapsedSince(0, 100_000), 100);
  assert.equal(elapsedSince(1000, 101_000), 100);
  assert.equal(elapsedSince(0, 0), 0);
});

// =====================================================================
// LIVE — RPC get_session_status trên Supabase thật.
// Skip nếu: (a) chưa có creds, hoặc (b) function chưa apply (probe PGRST202).
// Backdate start_time bằng Date trong TEST là scaffolding fixture (Invariant #1
// chỉ chi phối business logic; Δt thật vẫn do Postgres NOW() tính).
// =====================================================================
const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_VENUE = process.env.VENUE_ID;
const HAS_REAL = Boolean(REAL_URL && REAL_SERVICE && REAL_VENUE);

const TEST_TOKEN = "0b0b0b0b-0000-4000-8000-0000000000bb"; // namespaced, tự dọn
const MISSING_UUID = "00000000-0000-4000-8000-000000000000"; // UUID hợp lệ, chắc chắn không tồn tại

test(
  "get_session_status live: 404-path · phiên mới RUNNING · lazy-expiry",
  { skip: HAS_REAL ? false : "Chưa có Supabase creds thật trong env" },
  async (t) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    process.env.VENUE_ID = REAL_VENUE;
    const admin = createAdminClient();

    // Probe: function đã apply chưa? Chưa → skip (actionable, không fail suite).
    const probe = await admin.rpc("get_session_status", { p_session_id: MISSING_UUID });
    if (probe.error) {
      const m = `${probe.error.code ?? ""} ${probe.error.message ?? ""}`;
      if (/PGRST202|Could not find the function|does not exist/i.test(m)) {
        t.skip("get_session_status CHƯA apply lên Supabase — chạy supabase/schema.sql trong SQL Editor rồi chạy lại npm test");
        return;
      }
      assert.fail("probe RPC lỗi bất thường: " + m);
    }

    // 1) 404-path: UUID không tồn tại → 0 dòng (route map sang 404)
    assert.ok(Array.isArray(probe.data), "RPC trả mảng");
    assert.equal(probe.data.length, 0, "session không tồn tại → 0 dòng");

    const cleanup = () =>
      admin.from("focus_sessions").delete().eq("guest_token", TEST_TOKEN);
    await cleanup();
    try {
      // 2) Phiên mới (qua createSession) → RUNNING, Δt nhỏ, phase 1
      const created = await createSession(TEST_TOKEN);
      assert.equal(created.ok, true, "tạo phiên test phải ok");
      if (!created.ok) return;
      const r1 = await admin.rpc("get_session_status", { p_session_id: created.sessionId });
      assert.equal(r1.error, null, "RPC phiên mới không lỗi");
      const row1 = r1.data[0];
      assert.equal(row1.out_status, "RUNNING");
      assert.ok(
        row1.out_delta_seconds >= 0 && row1.out_delta_seconds < 120,
        "Δt phiên mới phải nhỏ, got " + row1.out_delta_seconds,
      );
      assert.equal(derivePhase(row1.out_delta_seconds), 1, "phiên mới → phase 1");

      // 3) Lazy-expiry: lùi start_time về 3000s trước (>2880) → RPC set EXPIRED + ghi DB
      const backdated = new Date(Date.now() - 3000 * 1000).toISOString();
      const { error: uErr } = await admin
        .from("focus_sessions")
        .update({ start_time: backdated })
        .eq("id", created.sessionId);
      assert.equal(uErr, null, "lùi start_time không lỗi");

      const r2 = await admin.rpc("get_session_status", { p_session_id: created.sessionId });
      assert.equal(r2.error, null);
      assert.equal(r2.data[0].out_status, "EXPIRED", "RPC trả EXPIRED khi >2880s");
      assert.ok(r2.data[0].out_delta_seconds > 2880, "Δt > 2880");

      // DB đã thực sự ghi EXPIRED chưa (lazy-expiry là UPDATE thật)?
      const { data: dbRow, error: sErr } = await admin
        .from("focus_sessions")
        .select("status")
        .eq("id", created.sessionId)
        .single();
      assert.equal(sErr, null);
      assert.equal(dbRow.status, "EXPIRED", "lazy-expiry phải ghi status=EXPIRED vào DB");
    } finally {
      await cleanup();
    }
  },
);
