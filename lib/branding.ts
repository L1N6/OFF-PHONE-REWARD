import {
  isValidThemeId,
  resolveTheme,
  themeCssVars,
  DEFAULT_THEME_ID,
  type ThemeCssVars,
} from "./theme";

/**
 * Branding venue (TV2-12). `themeId` chọn 1 preset (lib/theme). `challengeName` = tên thử thách
 * hiển thị. Custom-color override (primary_color/accent_color) defer V-sau → KHÔNG parse ở đây.
 * Pure — test được không cần DB/DOM.
 */
export interface Branding {
  themeId: string;
  challengeName: string;
}

/** Khớp seed (theme mặc định). Dùng làm fallback khi chưa fetch được venue. */
export const DEFAULT_BRANDING: Branding = {
  themeId: DEFAULT_THEME_ID,
  challengeName: "Gác Máy 45 Phút",
};

/** Map JSONB `venues.branding` → Branding; `theme_id` lạ/thiếu → default `cozy_cafe`. */
export function parseBranding(raw: unknown): Branding {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BRANDING };
  const b = raw as Record<string, unknown>;
  return {
    themeId: isValidThemeId(b.theme_id) ? b.theme_id : DEFAULT_THEME_ID,
    challengeName:
      typeof b.challenge_name === "string"
        ? b.challenge_name
        : DEFAULT_BRANDING.challengeName,
  };
}

/** CSS vars (`--color-*`) để set lên guest root → token đổi theo theme venue (SSR no-flash). */
export function brandingCssVars(branding: Branding): ThemeCssVars {
  return themeCssVars(branding.themeId);
}

/** Emoji mascot của theme venue (hiển thị ở Landing). */
export function brandingMascot(branding: Branding): string {
  return resolveTheme(branding.themeId).mascot;
}
