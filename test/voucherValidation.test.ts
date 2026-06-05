import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeVoucherResult,
  mockValidateVoucher,
} from "../lib/voucherValidation";

// =====================================================================
// OFFLINE — POS validation pure (specs §4 Module 4, T4-1).
// =====================================================================

test("describeVoucherResult: VALID → tone ok", () => {
  const v = describeVoucherResult({ ok: true, status: "VALID" });
  assert.equal(v.tone, "ok");
  assert.match(v.title, /Hợp lệ/);
});

test("describeVoucherResult: USED → tone warn", () => {
  const v = describeVoucherResult({ ok: true, status: "USED", redeemedAt: "x" });
  assert.equal(v.tone, "warn");
});

test("describeVoucherResult: NOT_CLAIMED & INVALID → tone error", () => {
  assert.equal(describeVoucherResult({ ok: true, status: "NOT_CLAIMED" }).tone, "error");
  assert.equal(describeVoucherResult({ ok: true, status: "INVALID" }).tone, "error");
});

test("describeVoucherResult: ok:false → tone error", () => {
  assert.equal(describeVoucherResult({ ok: false, error: "X" }).tone, "error");
});

test("mockValidateVoucher: map đúng 4 trạng thái", async () => {
  assert.equal((await mockValidateVoucher("OPR-AB12-CD34")).ok, true);
  assert.deepEqual(await mockValidateVoucher("OPR-AB12-CD34"), { ok: true, status: "VALID" });
  assert.equal((await mockValidateVoucher("opr-used-0001")).ok, true);
  assert.equal(
    ((await mockValidateVoucher("USEDxxxx")) as { status: string }).status,
    "USED",
  );
  assert.equal(
    ((await mockValidateVoucher("AVAIL-1")) as { status: string }).status,
    "NOT_CLAIMED",
  );
  assert.equal(
    ((await mockValidateVoucher("random")) as { status: string }).status,
    "INVALID",
  );
});
