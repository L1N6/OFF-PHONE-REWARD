// app/admin/venue/analytics/page.tsx
// TV2-2 — Analytics funnel. Server Component: session check → resolve venue
// (ownership qua venue_admin_users) → 9 count queries song song qua
// createAdminClient (service_role bypass RLS) → tính funnel pure (lib/analytics)
// → render. KHÔNG đổi schema, KHÔNG event-log (ADR-014).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/adminSupabase';
import { createAdminClient } from '@/lib/supabase';
import {
  buildFunnel,
  conversionRate,
  type SessionCounts,
  type VoucherCounts,
  type FunnelStage,
} from '@/lib/analytics';
import AnalyticsDashboard from '@/app/_components/AnalyticsDashboard';

export const metadata = { title: 'Thống kê — Off-Phone Rewards Admin' };

type VenueRow = { id: string; name: string };

// Lấy count từ thenable supabase (head:true → chỉ trả count). null → 0.
async function cnt(builder: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await builder;
  return count ?? 0;
}

export default async function VenueAnalyticsPage({
  searchParams,
}: {
  searchParams: { venue?: string };
}) {
  const supabase = createAuthServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  // Venue user này quản lý (owner hoặc manager) — KHÔNG tin client.
  const admin = createAdminClient();
  const { data: adminRows } = await admin
    .from('venue_admin_users')
    .select(`venue_id, role, venues ( id, name )`)
    .eq('supabase_uid', session.user.id);

  const venues = (adminRows ?? [])
    .filter((r) => r.venues)
    .map((r) => r.venues as unknown as VenueRow);

  const selected = venues.find((v) => v.id === searchParams.venue) ?? venues[0] ?? null;

  let funnel: FunnelStage[] = [];
  let sessions: SessionCounts = {
    total: 0,
    questPassed: 0,
    running: 0,
    completed: 0,
    failed: 0,
    expired: 0,
  };
  let vouchers: VoucherCounts = { available: 0, reserved: 0, redeemed: 0 };
  let conversion = 0;

  if (selected) {
    const venueId = selected.id;
    const sessionCount = (extra: Record<string, unknown> = {}) =>
      cnt(
        admin
          .from('focus_sessions')
          .select('*', { count: 'exact', head: true })
          .match({ venue_id: venueId, ...extra })
      );
    const voucherCount = (status: string) =>
      cnt(
        admin
          .from('vouchers')
          .select('*', { count: 'exact', head: true })
          .match({ venue_id: venueId, status })
      );

    const [total, questPassed, running, completed, failed, expired, vAvail, vRes, vRed] =
      await Promise.all([
        sessionCount(),
        sessionCount({ sub_quest_passed: true }),
        sessionCount({ status: 'RUNNING' }),
        sessionCount({ status: 'COMPLETED' }),
        sessionCount({ status: 'FAILED' }),
        sessionCount({ status: 'EXPIRED' }),
        voucherCount('AVAILABLE'),
        voucherCount('RESERVED'),
        voucherCount('REDEEMED'),
      ]);

    sessions = { total, questPassed, running, completed, failed, expired };
    vouchers = { available: vAvail, reserved: vRes, redeemed: vRed };
    funnel = buildFunnel(sessions, vouchers);
    conversion = conversionRate(sessions, vouchers);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-foreground">Thống kê</h1>
            <p className="text-xs text-muted">{session.user.email}</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {selected ? (
          <AnalyticsDashboard
            venueName={selected.name}
            funnel={funnel}
            sessions={sessions}
            vouchers={vouchers}
            conversion={conversion}
          />
        ) : (
          <div className="text-center py-12 text-muted">
            <p className="text-lg">Chưa có venue nào được gán cho tài khoản này.</p>
            <p className="text-sm mt-1">Liên hệ admin để được thêm vào venue.</p>
          </div>
        )}
      </div>
    </main>
  );
}
