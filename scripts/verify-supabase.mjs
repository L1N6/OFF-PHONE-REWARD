// Verify Supabase: env đầy đủ + kết nối được + schema/seed đã apply.
// Chạy:  node --env-file=.env.local scripts/verify-supabase.mjs
// (Node 24 tự nạp .env.local qua --env-file — không cần dotenv.)
//
// Đóng D-014 (live-connect) + D-015 (schema apply lên Supabase thật) khi PASS.
// Cố ý là .mjs độc lập (không phải .ts) → KHÔNG nằm trong type-check của `next build`,
// nên script ops không bao giờ làm hỏng deploy Vercel.

import { createClient } from "@supabase/supabase-js";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VENUE_ID",
  "CASHIER_BYPASS_CODE",
];

function fail(msg) {
  console.error("❌ " + msg);
  process.exitCode = 1;
}

async function main() {
  // 1) Env đầy đủ
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    fail("Thiếu env: " + missing.join(", "));
    console.error(
      "→ Tạo .env.local từ .env.example rồi điền giá trị, hoặc chạy với --env-file=.env.local",
    );
    return;
  }
  console.log("✓ Env đầy đủ (" + REQUIRED.length + " biến)");

  // 2) Kết nối admin (service_role)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // 3) Venue seed tồn tại + có sub_quest_config
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id, name, timezone, sub_quest_config")
    .eq("id", process.env.VENUE_ID)
    .single();
  if (vErr) return fail("Query venues lỗi: " + vErr.message);
  if (!venue) return fail("Không thấy venue VENUE_ID=" + process.env.VENUE_ID);
  const quests = venue.sub_quest_config?.quests ?? [];
  const hasCodeEntry = quests.some((q) => q.type === "code_entry");
  const hasPhysical = quests.some((q) => q.type === "physical_action");
  console.log(`✓ Venue: "${venue.name}" (tz=${venue.timezone})`);
  if (!hasCodeEntry || !hasPhysical)
    return fail("sub_quest_config thiếu code_entry hoặc physical_action");
  console.log("✓ sub_quest_config có code_entry + physical_action");

  // 4) Pool voucher
  const { count, error: cErr } = await supabase
    .from("vouchers")
    .select("*", { count: "exact", head: true })
    .eq("venue_id", process.env.VENUE_ID)
    .eq("status", "AVAILABLE");
  if (cErr) return fail("Query vouchers lỗi: " + cErr.message);
  console.log(`✓ Voucher AVAILABLE: ${count}`);
  if ((count ?? 0) < 1) return fail("Pool voucher rỗng — chạy seed.sql");

  // 5) RPC claim_voucher tồn tại (gọi với session giả → mong SESSION_NOT_FOUND)
  const { data: rpc, error: rErr } = await supabase.rpc("claim_voucher", {
    p_session_id: "99999999-9999-9999-9999-999999999999",
    p_venue_id: process.env.VENUE_ID,
  });
  if (rErr) return fail("RPC claim_voucher lỗi/không tồn tại: " + rErr.message);
  const errCode = Array.isArray(rpc) ? rpc[0]?.out_error : rpc?.out_error;
  if (errCode !== "SESSION_NOT_FOUND")
    return fail("RPC claim_voucher trả bất ngờ: " + JSON.stringify(rpc));
  console.log("✓ RPC claim_voucher hoạt động (SESSION_NOT_FOUND như mong đợi)");

  if (process.exitCode !== 1) {
    console.log("\n✅ Supabase OK — schema + seed + RPC sẵn sàng. (đóng D-014/D-015)");
  }
}

main().catch((e) => fail("Lỗi không mong đợi: " + (e?.message ?? e)));
