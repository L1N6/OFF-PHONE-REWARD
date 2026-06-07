"use client";

import { useState } from "react";
import {
  describeVoucherResult,
  type ValidateVoucherResult,
} from "../../lib/voucherValidation";
import { validateVoucher } from "../../actions/validateVoucher";

// T4-2: dùng validateVoucher server action thật (UPDATE REDEEMED atomic + phân loại).
const runValidate = validateVoucher;

const TONE_CLASS: Record<"ok" | "warn" | "error", string> = {
  ok: "bg-success text-white",
  warn: "bg-accent text-accent-fg",
  error: "bg-error text-white",
};

/**
 * Validate — trang POS cho nhân viên (specs §4 Module 4, T4-1). Mobile-first: input mã lớn +
 * nút VALIDATE. Hiện 4 trạng thái (✅ hợp lệ / ❌ chưa claim / ⚠️ đã dùng / ❌ không hợp lệ).
 * Tự clear input sau mỗi lần kiểm tra (sẵn cho mã kế tiếp). MOCK-FIRST (Invariant #7).
 */
export function Validate() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ValidateVoucherResult | null>(null);

  const submit = async () => {
    const value = code.trim();
    if (value.length === 0 || busy) return;
    setBusy(true);
    try {
      const r = await runValidate(value);
      setResult(r);
    } catch {
      setResult({ ok: false, error: "NETWORK" });
    } finally {
      setBusy(false);
      setCode(""); // tự clear cho lần quét kế tiếp
    }
  };

  const view = result ? describeVoucherResult(result) : null;
  const redeemedAt =
    result && result.ok && result.status === "USED" ? result.redeemedAt : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 bg-background px-5 py-8 text-foreground">
      <header>
        <h1 className="text-xl font-bold">Kiểm tra voucher</h1>
        <p className="text-sm text-muted">Nhập mã khách đưa rồi bấm KIỂM TRA.</p>
      </header>

      {view && (
        <div className={`rounded-xl px-4 py-5 text-center ${TONE_CLASS[view.tone]}`}>
          <p className="text-xl font-extrabold">{view.title}</p>
          <p className="mt-1 text-sm opacity-95">{view.detail}</p>
          {redeemedAt && (
            <p className="mt-1 text-xs opacity-90">Lúc: {formatTime(redeemedAt)}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="OPR-XXXX-XXXX"
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          disabled={busy}
          className="w-full rounded-lg border-2 border-border px-4 py-4 text-center font-mono text-2xl tracking-wider focus:border-primary focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={busy || code.trim().length === 0}
          className="w-full rounded-lg bg-primary px-4 py-4 text-lg font-bold text-primary-fg active:scale-95 disabled:opacity-50"
        >
          {busy ? "Đang kiểm tra…" : "KIỂM TRA"}
        </button>
      </div>
    </main>
  );
}

// Định dạng thời gian hiển thị (display-only — không phải business logic).
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}
