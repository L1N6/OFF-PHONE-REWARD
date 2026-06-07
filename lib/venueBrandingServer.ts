import { createAdminClient } from "./supabase";
import { DEFAULT_BRANDING, parseBranding, type Branding } from "./branding";

/**
 * Server-only: fetch `venues.branding` của VENUE_ID → Branding (TV2-12).
 * Fallback DEFAULT_BRANDING khi thiếu env / lỗi / DB không với tới (vd corporate proxy local).
 * Dùng bởi guest surfaces (landing + session) để áp theme SSR no-flash.
 */
export async function getVenueBranding(): Promise<Branding> {
  const venueId = process.env.VENUE_ID;
  if (!venueId) return DEFAULT_BRANDING;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("venues")
      .select("branding")
      .eq("id", venueId)
      .single();
    if (error) return DEFAULT_BRANDING;
    return parseBranding(data?.branding);
  } catch {
    return DEFAULT_BRANDING;
  }
}
