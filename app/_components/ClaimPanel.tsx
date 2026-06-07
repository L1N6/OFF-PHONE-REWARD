"use client";

import { useState } from "react";
import type { ClaimView } from "../../lib/sessionStatus";
import { getPosition, type GeoLike, type GeoReason } from "../../lib/geolocation";
import type {
  ClaimError,
  ClaimPresence,
  ClaimVoucherResult,
} from "../../lib/claim";
import { MESSAGES } from "../../lib/messages";

/**
 * ClaimPanel — UI nhận thưởng "Giờ Vàng" (specs §4 Module 2/3, T3-1..T3-4).
 *
 * View do `deriveClaimView` (T3-1): CLAIM / NEED_QUEST / EXPIRED.
 * Luồng CLAIM: idle → locating (GPS, T3-2) → claiming (claimVoucher, T3-4) →
 *   • claimed → hiện mã voucher (T3-5 sẽ làm đẹp thành coupon + lưu sessionStorage).
 *   • need_bypass → GPS không lấy được HOẶC vị trí ngoài bán kính → form nhập mã nhân viên
 *     (T3-3): `onBypass` verify tức thì → đúng → claim lại bằng bypass.
 *   • claim_error → message thân thiện theo lỗi RPC.
 */

export type BypassFn = (
  code: string,
) => Promise<{ ok: true; valid: boolean } | { ok: false; error: string }>;

export type ClaimFn = (presence: ClaimPresence) => Promise<ClaimVoucherResult>;

type ClaimStep =
  | { k: "idle" }
  | { k: "locating" }
  | { k: "claiming" }
  | { k: "claimed"; code: string }
  | { k: "need_bypass"; hint: string }
  | { k: "claim_error"; error: ClaimError };

const GEO_HINT: Record<GeoReason, string> = {
  PERMISSION_DENIED: "Bạn chưa cho phép truy cập vị trí.",
  TIMEOUT: "Lấy vị trí quá lâu.",
  UNAVAILABLE: "Chưa xác định được vị trí.",
  UNSUPPORTED: "Thiết bị không hỗ trợ định vị.",
};

const CLAIM_ERROR_MSG: Record<ClaimError, string> = {
  INVALID_SESSION: "Phiên không hợp lệ. Hãy bắt đầu lại nhé.",
  PRESENCE_FAILED: "Chưa xác nhận được bạn đang ở quán.",
  QUEST_NOT_PASSED: "Bạn cần hoàn thành Blind Box trước đã.",
  OUTSIDE_WINDOW: "Đã quá giờ nhận thưởng (48 phút).",
  SESSION_NOT_RUNNING: "Phiên không còn hiệu lực.",
  POOL_EMPTY: MESSAGES.poolEmpty,
  SERVER_ERROR: "Có lỗi, thử lại sau giúp mình.",
};

export function ClaimPanel({
  view,
  onClaim,
  onBypass,
  onClaimed,
}: {
  view: ClaimView;
  onClaim?: ClaimFn;
  onBypass?: BypassFn;
  onClaimed?: (code: string) => void; // T3-5: claim ok → parent lưu + chuyển VoucherScreen
}) {
  const [step, setStep] = useState<ClaimStep>({ k: "idle" });

  if (view === "EXPIRED") {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-3xl">⌛</p>
        <p className="mt-2 font-semibold">Đã quá giờ nhận thưởng (48 phút).</p>
        <p className="mt-1 text-sm opacity-80">Tiếc quá! Hẹn bạn thử lại vào ngày mai nhé.</p>
        <a
          href="/"
          className="mt-4 inline-block rounded-md bg-accent px-5 py-2 font-semibold text-accent-fg"
        >
          Về trang đầu
        </a>
      </div>
    );
  }

  if (view === "NEED_QUEST") {
    return (
      <div className="mx-auto max-w-sm rounded-xl border-2 border-accent/50 bg-white/5 p-5 text-center">
        <p className="text-3xl">📦</p>
        <p className="mt-2 font-semibold text-accent">Sắp xong rồi!</p>
        <p className="mt-1 text-sm opacity-85">{MESSAGES.questNotPassedInWindow}</p>
      </div>
    );
  }

  if (view !== "CLAIM") return null; // "NONE" — chưa tới Giờ Vàng / phiên đã đóng

  // --- Luồng CLAIM ---
  const runClaim = async (presence: ClaimPresence) => {
    if (!onClaim) return; // chưa wire (không xảy ra ở app thật)
    setStep({ k: "claiming" });
    try {
      const r = await onClaim(presence);
      if (r.ok) {
        onClaimed?.(r.code); // T3-5: parent lưu sessionStorage + swap VoucherScreen (ClaimPanel unmount)
        setStep({ k: "claimed", code: r.code }); // fallback hiển thị nếu dùng standalone (không onClaimed)
      } else if (r.error === "PRESENCE_FAILED") {
        // GPS lấy được nhưng ngoài bán kính → mời dùng mã nhân viên.
        setStep({ k: "need_bypass", hint: "Vị trí chưa khớp với quán." });
      } else {
        setStep({ k: "claim_error", error: r.error });
      }
    } catch {
      // Defensive (T5-3): onClaim không nên reject nhưng nếu có → không để unhandled.
      setStep({ k: "claim_error", error: "SERVER_ERROR" });
    }
  };

  const startClaim = async () => {
    setStep({ k: "locating" });
    const geo: GeoLike | undefined =
      typeof navigator !== "undefined" && navigator.geolocation
        ? navigator.geolocation
        : undefined;
    const r = await getPosition(geo);
    if (r.ok) {
      // accuracy > 100m: KHÔNG chặn — vẫn claim; nếu thật sự xa, RPC/Haversine sẽ báo PRESENCE_FAILED.
      await runClaim({ lat: r.lat, lng: r.lng });
    } else {
      setStep({ k: "need_bypass", hint: GEO_HINT[r.reason] });
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
      {step.k === "claimed" ? (
        <Claimed code={step.code} />
      ) : (
        <>
          <p className="text-sm opacity-85">🎉 Bạn đã hoàn thành 45 phút gác máy!</p>

          {step.k === "idle" && (
            <button
              onClick={startClaim}
              className="mt-4 w-full rounded-2xl bg-accent px-6 py-5 text-2xl font-extrabold text-accent-fg shadow-lg shadow-accent/30 transition active:scale-95"
            >
              🎁 NHẬN VOUCHER
            </button>
          )}

          {step.k === "locating" && (
            <p className="mt-5 animate-pulse text-lg font-medium">📍 Đang lấy vị trí…</p>
          )}

          {step.k === "claiming" && (
            <p className="mt-5 animate-pulse text-lg font-medium">🎁 Đang nhận voucher…</p>
          )}

          {step.k === "claim_error" && (
            <div className="mt-4 w-full rounded-xl border border-rose-300/40 bg-white/5 p-4">
              <p className="text-sm text-rose-200">{CLAIM_ERROR_MSG[step.error]}</p>
              <button
                onClick={startClaim}
                className="mt-3 w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg"
              >
                Thử lại
              </button>
            </div>
          )}

          {step.k === "need_bypass" && (
            <div className="mt-4 w-full rounded-xl border border-accent/40 bg-white/5 p-4">
              <p className="text-sm text-accent">{step.hint}</p>
              <button
                onClick={startClaim}
                className="mt-3 w-full rounded-md bg-white/15 px-4 py-2 font-semibold text-white"
              >
                📍 Thử lấy vị trí lại
              </button>
              <div className="mt-4 border-t border-white/15 pt-3 text-left">
                <p className="text-xs opacity-80">
                  📍 Đang ở quán? Nhờ nhân viên cho <b>mã xác nhận</b>:
                </p>
                {onBypass ? (
                  <BypassForm
                    onBypass={onBypass}
                    onVerified={(code) => runClaim({ bypassCode: code })}
                  />
                ) : (
                  <p className="mt-2 text-xs opacity-60">
                    (Bước nhập mã nhân viên sẽ có ở bản cập nhật tới.)
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Claimed({ code }: { code: string }) {
  return (
    <div className="w-full text-center">
      <p className="text-4xl">🎉</p>
      <p className="mt-1 font-semibold text-accent">Nhận thưởng thành công!</p>
      <div className="mt-3 rounded-xl border-2 border-dashed border-accent bg-white/10 p-4">
        <p className="text-xs uppercase tracking-widest opacity-70">Mã voucher</p>
        <p className="mt-1 select-all font-mono text-2xl font-bold tracking-wider">{code}</p>
      </div>
      <p className="mt-3 text-sm opacity-85">Đưa mã này cho nhân viên để được giảm 10%.</p>
    </div>
  );
}

function BypassForm({
  onBypass,
  onVerified,
}: {
  onBypass: BypassFn;
  onVerified: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"none" | "wrong" | "error">("none");

  const submit = async () => {
    setBusy(true);
    setFeedback("none");
    try {
      const r = await onBypass(code);
      if (r.ok && r.valid) {
        onVerified(code.trim()); // claim bằng bypass (server RE-VERIFY)
        return;
      }
      // Mã sai HOẶC lỗi server → KHÔNG reveal lý do (specs §4 Module 3).
      setFeedback(r.ok ? "wrong" : "error");
    } catch {
      setFeedback("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mã nhân viên"
          disabled={busy}
          inputMode="numeric"
          className="w-full rounded-md px-3 py-2 text-accent-fg"
        />
        <button
          onClick={submit}
          disabled={busy || code.trim().length === 0}
          className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg disabled:opacity-50"
        >
          {busy ? "…" : "Xác nhận"}
        </button>
      </div>
      {feedback === "wrong" && (
        <p className="mt-2 text-sm text-rose-300">❌ Mã không đúng, thử lại nhé.</p>
      )}
      {feedback === "error" && (
        <p className="mt-2 text-sm text-rose-300">⚠️ Có lỗi, thử lại sau giúp mình.</p>
      )}
    </div>
  );
}
