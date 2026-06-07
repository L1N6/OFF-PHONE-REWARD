import { getVenueBranding } from "../lib/venueBrandingServer";
import { Landing } from "./_components/Landing";

// Branding đọc từ DB lúc request (force-dynamic → KHÔNG gọi DB lúc build).
export const dynamic = "force-dynamic";

export default async function Page() {
  const branding = await getVenueBranding();
  return <Landing branding={branding} />;
}
