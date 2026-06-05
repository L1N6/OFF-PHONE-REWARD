import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readStoredSessionId,
  writeStoredSessionId,
  SESSION_ID_KEY,
} from "../lib/sessionStore";

// =====================================================================
// OFFLINE — session_id storage pure/injectable (T5-1 resume). Mock Storage = Map.
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

test("readStoredSessionId: rỗng → null", () => {
  assert.equal(readStoredSessionId(mockStorage()), null);
});

test("writeStoredSessionId → readStoredSessionId round-trip", () => {
  const s = mockStorage();
  const id = "11111111-1111-4111-8111-111111111111";
  writeStoredSessionId(s, id);
  assert.equal(readStoredSessionId(s), id);
  assert.equal(s.map.get(SESSION_ID_KEY), id);
});

test("readStoredSessionId: chuỗi rỗng/space → null", () => {
  assert.equal(readStoredSessionId(mockStorage({ [SESSION_ID_KEY]: "" })), null);
  assert.equal(readStoredSessionId(mockStorage({ [SESSION_ID_KEY]: "   " })), null);
});
