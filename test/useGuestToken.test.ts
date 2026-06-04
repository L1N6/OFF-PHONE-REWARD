import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateGuestToken,
  useGuestToken,
  GUEST_TOKEN_KEY,
} from "../hooks/useGuestToken";

/** Mock tối thiểu của Storage (getItem/setItem) backed bằng Map — không cần DOM. */
function mockStorage(initial?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (k: string): string | null => map.get(k) ?? null,
    setItem: (k: string, v: string): void => {
      map.set(k, v);
    },
    map,
  };
}

test("getOrCreateGuestToken trả token đã có, KHÔNG sinh mới", () => {
  const storage = mockStorage({ [GUEST_TOKEN_KEY]: "existing-token" });
  let gen = 0;
  const token = getOrCreateGuestToken(storage, () => {
    gen++;
    return "new-token";
  });
  assert.equal(token, "existing-token");
  assert.equal(gen, 0); // không gọi genId khi đã có token
});

test("getOrCreateGuestToken sinh + lưu khi storage rỗng", () => {
  const storage = mockStorage();
  const token = getOrCreateGuestToken(storage, () => "fresh-uuid");
  assert.equal(token, "fresh-uuid");
  assert.equal(storage.map.get(GUEST_TOKEN_KEY), "fresh-uuid"); // đã persist
});

test("getOrCreateGuestToken persist: gọi 2 lần trả cùng token, chỉ sinh 1 lần", () => {
  const storage = mockStorage();
  let gen = 0;
  const genId = () => {
    gen++;
    return `uuid-${gen}`;
  };
  const first = getOrCreateGuestToken(storage, genId);
  const second = getOrCreateGuestToken(storage, genId);
  assert.equal(first, second); // lần 2 đọc lại từ storage
  assert.equal(gen, 1); // không sinh mới ở lần 2
});

test("useGuestToken export là function (module load + export OK)", () => {
  assert.equal(typeof useGuestToken, "function");
});
