import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readClaimedVoucher,
  writeClaimedVoucher,
  CLAIMED_VOUCHER_KEY,
} from "../lib/voucher";

// =====================================================================
// OFFLINE — voucher storage pure/injectable (specs §4 Module 3, T3-5).
// Mock Storage backed bằng Map (như useGuestToken).
// =====================================================================

function mockStorage(init: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(init));
  return {
    getItem: (k: string): string | null => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string): void => {
      m.set(k, v);
    },
    map: m,
  };
}

test("readClaimedVoucher: storage rỗng → null", () => {
  assert.equal(readClaimedVoucher(mockStorage()), null);
});

test("writeClaimedVoucher → readClaimedVoucher round-trip", () => {
  const s = mockStorage();
  writeClaimedVoucher(s, "OPR-AAAA-BBBB");
  assert.equal(readClaimedVoucher(s), "OPR-AAAA-BBBB");
  assert.equal(s.map.get(CLAIMED_VOUCHER_KEY), "OPR-AAAA-BBBB");
});

test("readClaimedVoucher: chuỗi rỗng / chỉ khoảng trắng → null", () => {
  assert.equal(readClaimedVoucher(mockStorage({ [CLAIMED_VOUCHER_KEY]: "" })), null);
  assert.equal(readClaimedVoucher(mockStorage({ [CLAIMED_VOUCHER_KEY]: "   " })), null);
});
