import { test } from "node:test";
import assert from "node:assert/strict";
import { safeEqual } from "../lib/bypass";
import { verifyBypass } from "../actions/verifyBypass";

// =====================================================================
// OFFLINE — constant-time compare + verifyBypass action (specs §4 Module 3, T3-3).
// =====================================================================

test("safeEqual: chuỗi giống nhau → true", () => {
  assert.equal(safeEqual("CAFE123", "CAFE123"), true);
  assert.equal(safeEqual("", ""), true);
});

test("safeEqual: khác nội dung → false", () => {
  assert.equal(safeEqual("CAFE123", "CAFE124"), false);
});

test("safeEqual: khác độ dài → false (KHÔNG throw — đã hash về 32 byte)", () => {
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("abcd", "abc"), false);
});

test("safeEqual: phân biệt hoa/thường", () => {
  assert.equal(safeEqual("cafe123", "CAFE123"), false);
});

// verifyBypass đọc env CASHIER_BYPASS_CODE → save/restore để không lệ thuộc .env.local.
function withEnv(value: string | undefined, fn: () => Promise<void>) {
  return async () => {
    const prev = process.env.CASHIER_BYPASS_CODE;
    if (value === undefined) delete process.env.CASHIER_BYPASS_CODE;
    else process.env.CASHIER_BYPASS_CODE = value;
    try {
      await fn();
    } finally {
      if (prev === undefined) delete process.env.CASHIER_BYPASS_CODE;
      else process.env.CASHIER_BYPASS_CODE = prev;
    }
  };
}

test(
  "verifyBypass: mã đúng → ok:true, valid:true (trim khoảng trắng)",
  withEnv("SECRET99", async () => {
    assert.deepEqual(await verifyBypass("SECRET99"), { ok: true, valid: true });
    assert.deepEqual(await verifyBypass("  SECRET99  "), { ok: true, valid: true });
  }),
);

test(
  "verifyBypass: mã sai / rỗng → ok:true, valid:false (KHÔNG reveal lý do)",
  withEnv("SECRET99", async () => {
    assert.deepEqual(await verifyBypass("nope"), { ok: true, valid: false });
    assert.deepEqual(await verifyBypass(""), { ok: true, valid: false });
    assert.deepEqual(await verifyBypass("   "), { ok: true, valid: false });
  }),
);

test(
  "verifyBypass: chưa set env → ok:false, SERVER_ERROR",
  withEnv(undefined, async () => {
    assert.deepEqual(await verifyBypass("anything"), {
      ok: false,
      error: "SERVER_ERROR",
    });
  }),
);
