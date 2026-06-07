'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateVenueTheme } from '@/actions/updateVenueTheme';
import { THEMES, THEME_IDS, resolveTheme, type Theme } from '@/lib/theme';

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-fg py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
    >
      {pending ? 'Đang lưu...' : 'Lưu theme'}
    </button>
  );
}

// Mockup điện thoại mini — xem trước giao diện khách với theme đang chọn.
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div
      className="rounded-2xl px-4 py-6 text-center shadow-inner"
      style={{
        background: `linear-gradient(160deg, rgb(${theme.primary}), rgb(${theme.primaryDeep}))`,
        color: `rgb(${theme.primaryFg})`,
      }}
    >
      <div className="text-4xl" aria-hidden>{theme.mascot}</div>
      <span
        className="mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold"
        style={{ backgroundColor: `rgb(${theme.accent})`, color: `rgb(${theme.accentFg})` }}
      >
        Gác Máy 45 Phút
      </span>
      <p className="mt-3 text-sm font-semibold leading-snug">
        Gác lại mạng xã hội 45 phút
      </p>
      <div
        className="mt-4 rounded-xl py-2 text-sm font-bold"
        style={{ backgroundColor: `rgb(${theme.accent})`, color: `rgb(${theme.accentFg})` }}
      >
        BẮT ĐẦU
      </div>
    </div>
  );
}

export default function VenueThemeForm({
  venueId,
  venueName,
  currentThemeId,
}: {
  venueId: string;
  venueName: string;
  currentThemeId: string;
}) {
  const [state, action] = useFormState(updateVenueTheme, {});
  const [selected, setSelected] = useState(currentThemeId);
  const theme = resolveTheme(selected);

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 sm:p-8 space-y-5">
      <div>
        <h2 className="font-semibold text-lg text-foreground">{venueName}</h2>
        <p className="text-xs text-muted mt-0.5">
          Chọn chủ đề giao diện cho khách. Áp dụng ngay sau khi lưu.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Danh sách preset */}
        <div className="space-y-2">
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            const active = id === selected;
            return (
              <button
                type="button"
                key={id}
                onClick={() => setSelected(id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted'
                }`}
              >
                <span className="flex shrink-0 gap-1">
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: `rgb(${t.primary})` }} />
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: `rgb(${t.accent})` }} />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {t.mascot} {t.name}
                </span>
                {active && <span className="text-sm text-primary">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Live preview */}
        <div>
          <p className="mb-2 text-xs text-muted">Xem trước giao diện khách</p>
          <ThemePreview theme={theme} />
        </div>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="venue_id" value={venueId} />
        <input type="hidden" name="theme_id" value={selected} />

        {state.error && (
          <p className="text-sm text-error bg-error/10 border border-error/30 rounded-lg p-3">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-success bg-success/10 border border-success/30 rounded-lg p-3">
            ✓ Đã lưu theme. Giao diện khách đổi ngay từ lần truy cập tiếp theo.
          </p>
        )}

        <SaveBtn />
      </form>
    </div>
  );
}
