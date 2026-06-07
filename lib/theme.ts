/**
 * Theme presets + resolver (TV2-12, specs §9.3/§9.5). PURE, client-safe.
 *
 * Mỗi venue chọn 1 preset qua `venues.branding.theme_id` (TV2-13). `themeCssVars(themeId)`
 * trả object CSS variables để set lên guest root → token (bg-primary/text-accent…, ADR-012)
 * resolve theo theme. Màu lưu dạng **kênh RGB "R G B"** khớp định dạng token (KHÔNG #hex).
 *
 * Custom-color override (primary_color/accent_color trong JSONB) = V-sau — hiện theme thuần
 * theo preset id.
 */

export interface Theme {
  id: string;
  name: string;
  mascot: string;
  // kênh RGB "R G B"
  primary: string;
  primaryFg: string;
  primaryDeep: string; // đáy gradient phiên (Shell)
  accent: string;
  accentFg: string;
}

export const THEMES: Record<string, Theme> = {
  cozy_cafe: {
    id: "cozy_cafe",
    name: "Cozy Cafe",
    mascot: "☕",
    primary: "15 118 110",
    primaryFg: "255 255 255",
    primaryDeep: "11 59 56",
    accent: "245 158 11",
    accentFg: "30 41 59",
  },
  cat_cafe: {
    id: "cat_cafe",
    name: "Vương quốc Mèo",
    mascot: "🐱",
    primary: "217 101 78",
    primaryFg: "255 255 255",
    primaryDeep: "91 36 27",
    accent: "251 191 36",
    accentFg: "66 32 6",
  },
  book_acoustic: {
    id: "book_acoustic",
    name: "Sách & Acoustic",
    mascot: "📖",
    primary: "85 122 94",
    primaryFg: "255 255 255",
    primaryDeep: "46 66 51",
    accent: "217 195 154",
    accentFg: "63 45 22",
  },
  lofi_night: {
    id: "lofi_night",
    name: "Lo-fi Night",
    mascot: "🌙",
    primary: "79 70 229",
    primaryFg: "255 255 255",
    primaryDeep: "30 27 75",
    accent: "167 139 250",
    accentFg: "30 27 75",
  },
};

export const DEFAULT_THEME_ID = "cozy_cafe";
export const THEME_IDS = Object.keys(THEMES);

export function isValidThemeId(id: unknown): id is string {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(THEMES, id);
}

/** themeId không hợp lệ/thiếu → default `cozy_cafe`. */
export function resolveTheme(themeId: string | null | undefined): Theme {
  return isValidThemeId(themeId) ? THEMES[themeId] : THEMES[DEFAULT_THEME_ID];
}

export type ThemeCssVars = Record<string, string>;

/** CSS variables (`--color-*`) để spread lên guest root → token resolve theo theme. */
export function themeCssVars(themeId: string | null | undefined): ThemeCssVars {
  const t = resolveTheme(themeId);
  return {
    "--color-primary": t.primary,
    "--color-primary-fg": t.primaryFg,
    "--color-primary-deep": t.primaryDeep,
    "--color-accent": t.accent,
    "--color-accent-fg": t.accentFg,
  };
}
