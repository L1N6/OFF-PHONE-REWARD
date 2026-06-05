import { test } from "node:test";
import assert from "node:assert/strict";
import { MESSAGES } from "../lib/messages";

// =====================================================================
// OFFLINE — copy ca biên (specs UX, T5-2). Guard nội dung chính, chống regress.
// =====================================================================

test("rateLimited: nhắc đã xong hôm nay + quay lại ngày mai", () => {
  assert.match(MESSAGES.rateLimited, /hôm nay/);
  assert.match(MESSAGES.rateLimited, /ngày mai/);
});

test("poolEmpty: hết voucher + hỏi nhân viên", () => {
  assert.match(MESSAGES.poolEmpty, /Hết voucher/);
  assert.match(MESSAGES.poolEmpty, /nhân viên/);
});

test("questNotPassedInWindow: nhắc hoàn thành Blind Box", () => {
  assert.match(MESSAGES.questNotPassedInWindow, /Blind Box/);
});
