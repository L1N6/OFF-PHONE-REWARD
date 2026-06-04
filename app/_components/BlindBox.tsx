"use client";

import { useState } from "react";
import type { ActiveQuest } from "../../lib/quests";

export type ValidateFn = (
  input: { answer?: string; confirmed?: boolean },
) => Promise<{ ok: true; valid: boolean } | { ok: false; error: string }>;

/**
 * BlindBox — UI Phase 2 (specs §3). Render quest hôm nay (code_entry / physical_action),
 * wire `onValidate` (→ validateSubQuest). Khi `passed` → khoá, hiện trạng thái hoàn thành.
 *
 * Visual border pulse (overlay `animate-pulse`) LUÔN chạy — fallback cho `navigator.vibrate`
 * silent-fail trên iOS Safari (Invariant #4). Đáp án KHÔNG hiển thị (chỉ nhập).
 */
export function BlindBox({
  quests,
  passed,
  onValidate,
}: {
  quests: ActiveQuest[];
  passed: boolean;
  onValidate: ValidateFn;
}) {
  return (
    <div className="relative mx-auto w-full max-w-sm rounded-xl border-2 border-amber-300/60 bg-white/5 p-5">
      {/* Visual fallback (Inv #4): vòng amber nhấp nháy — chạy cả khi vibrate fail (iOS). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px animate-pulse rounded-xl ring-2 ring-amber-300"
      />

      {passed ? (
        <Done />
      ) : (
        <div className="relative">
          <p className="mb-3 text-center text-xs opacity-80">
            📦 Mở <b>Blind Box</b> + đọc <b>Sổ Người Lạ</b> — rồi hoàn thành nhiệm vụ:
          </p>
          {quests.length === 0 ? (
            <p className="text-center text-sm opacity-80">
              Hôm nay chưa có nhiệm vụ. Hỏi nhân viên giúp bạn nhé!
            </p>
          ) : (
            quests.map((q) => (
              <QuestCard key={q.id} quest={q} onValidate={onValidate} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Done() {
  return (
    <div className="relative text-center">
      <p className="text-4xl">✅</p>
      <p className="mt-1 font-semibold text-amber-200">Đã hoàn thành nhiệm vụ!</p>
      <p className="mt-1 text-xs opacity-70">
        Giữ máy tới hết 45 phút để mở khoá nhận thưởng.
      </p>
    </div>
  );
}

function QuestCard({
  quest,
  onValidate,
}: {
  quest: ActiveQuest;
  onValidate: ValidateFn;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"none" | "wrong" | "error">("none");

  const submit = async (input: { answer?: string; confirmed?: boolean }) => {
    setBusy(true);
    setFeedback("none");
    try {
      const r = await onValidate(input);
      if (r.ok && r.valid) return; // parent set passed → render Done
      setFeedback(r.ok ? "wrong" : "error");
    } catch {
      setFeedback("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 rounded-lg bg-white/10 p-3 last:mb-0">
      <p className="font-semibold">{quest.title}</p>
      <p className="mt-0.5 text-sm opacity-85">{quest.description}</p>

      {quest.type === "code_entry" ? (
        <div className="mt-2">
          <div className="flex gap-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={quest.hint ?? "Nhập mã"}
              disabled={busy}
              className="w-full rounded-md px-3 py-2 text-slate-900"
            />
            <button
              onClick={() => submit({ answer })}
              disabled={busy || answer.trim().length === 0}
              className="rounded-md bg-amber-400 px-4 py-2 font-semibold text-slate-900 disabled:opacity-50"
            >
              {busy ? "…" : "Gửi"}
            </button>
          </div>
          {quest.hint && <p className="mt-1 text-xs opacity-60">💡 {quest.hint}</p>}
        </div>
      ) : (
        <button
          onClick={() => submit({ confirmed: true })}
          disabled={busy}
          className="mt-2 w-full rounded-md bg-amber-400 px-4 py-2 font-semibold text-slate-900 disabled:opacity-50"
        >
          {busy ? "…" : (quest.confirm_button ?? "✅ Đã xong")}
        </button>
      )}

      {feedback === "wrong" && (
        <p className="mt-2 text-sm text-rose-300">❌ Chưa đúng, thử lại nhé.</p>
      )}
      {feedback === "error" && (
        <p className="mt-2 text-sm text-rose-300">⚠️ Có lỗi, thử lại sau giúp mình.</p>
      )}
    </div>
  );
}
