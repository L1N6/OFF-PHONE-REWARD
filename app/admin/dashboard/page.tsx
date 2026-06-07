import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/adminSupabase';
import { createAdminClient } from '@/lib/supabase';
import { signOut } from '@/actions/adminAuth';
import AdminDashboard from '@/app/_components/AdminDashboard';

export const metadata = { title: 'Dashboard — Off-Phone Rewards Admin' };

export default async function DashboardPage() {
  const supabase = createAuthServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  const admin = createAdminClient();
  const { data: adminRows } = await admin
    .from('venue_admin_users')
    .select(`
      venue_id,
      role,
      venues (
        id, name, latitude, longitude, radius_meters, active
      )
    `)
    .eq('supabase_uid', session.user.id);

  const venues = (adminRows ?? [])
    .filter((r) => r.venues)
    .map((r) => ({
      ...(r.venues as unknown as Record<string, unknown>),
      role: r.role,
    }));

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-foreground">Off-Phone Rewards</h1>
            <p className="text-xs text-muted">{session.user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Venue của bạn</h2>
        <AdminDashboard venues={venues as Parameters<typeof AdminDashboard>[0]['venues']} />
      </div>
    </main>
  );
}
