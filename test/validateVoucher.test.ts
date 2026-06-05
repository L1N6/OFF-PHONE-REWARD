import { test } from "node:test";
import assert from "node:assert/strict";
import { validateVoucher } from "../actions/validateVoucher";
import { createAdminClient } from "../lib/supabase";

const REAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_VENUE = process.env.VENUE_ID;
const HAS_REAL = Boolean(REAL_URL && REAL_SERVICE && REAL_VENUE);

// Codes test namespaced → cleanup an toàn (không đụng 20 voucher seed).
const RACE_CODE = "ZZTEST-RACE";

test("validateVoucher → INVALID khi code rỗng (offline, không chạm DB)", async () => {
  assert.deepEqual(await validateVoucher(""), { ok: true, status: "INVALID" });
  assert.deepEqual(await validateVoucher("   "), { ok: true, status: "INVALID" });
});

// Live: RACE double-redeem (Invariant #2/#8). Skip nếu chưa có creds / function chưa apply.
test(
  "validateVoucher live: race 2 validate cùng voucher RESERVED → đúng 1 REDEEMED",
  { skip: HAS_REAL ? false : "Chưa có Supabase creds thật trong env" },
  async (t) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SERVICE;
    process.env.VENUE_ID = REAL_VENUE;
    const admin = createAdminClient();

    // Probe: function đã apply chưa?
    const probe = await admin.rpc("validate_voucher", {
      p_code: "__PROBE__",
      p_venue_id: REAL_VENUE,
    });
    if (probe.error) {
      const m = `${probe.error.code ?? ""} ${probe.error.message ?? ""}`;
      if (/PGRST202|Could not find the function|does not exist/i.test(m)) {
        t.skip("validate_voucher CHƯA apply lên Supabase — chạy supabase/schema.sql rồi chạy lại npm test");
        return;
      }
      assert.fail("probe RPC lỗi bất thường: " + m);
    }

    const cleanup = () =>
      admin.from("vouchers").delete().eq("venue_id", REAL_VENUE).eq("code", RACE_CODE);

    await cleanup();
    try {
      // Insert 1 voucher RESERVED (hạn 1 ngày).
      const expires = new Date(Date.now() + 86_400_000).toISOString();
      const { error: iErr } = await admin.from("vouchers").insert({
        venue_id: REAL_VENUE,
        code: RACE_CODE,
        status: "RESERVED",
        expires_at: expires,
      });
      assert.equal(iErr, null, "insert voucher test không lỗi");

      // RACE: 2 validate đồng thời.
      const [a, b] = await Promise.all([
        validateVoucher(RACE_CODE),
        validateVoucher(RACE_CODE),
      ]);
      assert.equal(a.ok, true);
      assert.equal(b.ok, true);

      // Đúng 1 VALID, 1 USED (request thua thấy đã REDEEMED).
      const statuses = [a, b].map((r) => (r.ok ? r.status : "ERR")).sort();
      assert.deepEqual(statuses, ["USED", "VALID"], "race phải ra đúng 1 VALID + 1 USED, got " + JSON.stringify(statuses));

      // DB: voucher REDEEMED.
      const { data: row } = await admin
        .from("vouchers")
        .select("status")
        .eq("venue_id", REAL_VENUE)
        .eq("code", RACE_CODE)
        .single();
      assert.equal(row?.status, "REDEEMED", "voucher phải REDEEMED");

      // Validate lại → USED (idempotent, không redeem lần 2).
      const again = await validateVoucher(RACE_CODE);
      assert.equal(again.ok && again.status === "USED", true, "validate lại → USED");
    } finally {
      await cleanup();
    }
  },
);
