import { createAdminClient } from "../lib/supabase";
import { DEFAULT_BRANDING, parseBranding, type Branding } from "../lib/branding";
import { Landing } from "./_components/Landing";

// Branding đọc từ DB lúc request (force-dynamic → KHÔNG gọi DB lúc build).
export const dynamic = "force-dynamic";

async function getBranding(): Promise<Branding> {
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
    // DB không với tới (vd corporate proxy lúc local dev) → default (khớp seed).
    return DEFAULT_BRANDING;
  }
}

export default async function Page() {
  const branding = await getBranding();
  return <Landing branding={branding} />;
}
