export interface Branding {
  primaryColor: string;
  accentColor: string;
  challengeName: string;
}

/** Khớp với seed venue (`supabase/seed.sql`). Dùng làm fallback khi chưa fetch được venue. */
export const DEFAULT_BRANDING: Branding = {
  primaryColor: "#0F766E",
  accentColor: "#F59E0B",
  challengeName: "Gác Máy 45 Phút",
};

/**
 * Map JSONB `venues.branding` (snake_case từ DB) → Branding; field thiếu/sai kiểu → default.
 * Pure — test được không cần DB/DOM.
 */
export function parseBranding(raw: unknown): Branding {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BRANDING };
  const b = raw as Record<string, unknown>;
  return {
    primaryColor:
      typeof b.primary_color === "string"
        ? b.primary_color
        : DEFAULT_BRANDING.primaryColor,
    accentColor:
      typeof b.accent_color === "string"
        ? b.accent_color
        : DEFAULT_BRANDING.accentColor,
    challengeName:
      typeof b.challenge_name === "string"
        ? b.challenge_name
        : DEFAULT_BRANDING.challengeName,
  };
}
