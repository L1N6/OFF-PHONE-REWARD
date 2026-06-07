import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/adminSupabase';
import { createAdminClient } from '@/lib/supabase';
import VenueLocationForm from '@/app/_components/VenueLocationForm';

export const metadata = { title: 'Cấu hình vị trí — Off-Phone Rewards Admin' };

type VenueRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
};

export default async function VenueLocationPage({
  searchParams,
}: {
  searchParams: { venue?: string };
}) {
  const supabase = createAuthServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  // Venue mà user này quản lý (owner hoặc manager).
  const admin = createAdminClient();
  const { data: adminRows } = await admin
    .from('venue_admin_users')
    .select(`
      venue_id,
      role,
      venues ( id, name, latitude, longitude, radius_meters )
    `)
    .eq('supabase_uid', session.user.id);

  const venues = (adminRows ?? [])
    .filter((r) => r.venues)
    .map((r) => r.venues as unknown as VenueRow);

  // Chọn venue theo ?venue= nếu hợp lệ, mặc định venue đầu tiên.
  const selected =
    venues.find((v) => v.id === searchParams.venue) ?? venues[0] ?? null;

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-foreground">Cấu hình vị trí quán</h1>
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

      <div className="max-w-2xl mx-auto px-6 py-8">
        {selected ? (
          <VenueLocationForm
            venueId={selected.id}
            venueName={selected.name}
            initialLat={selected.latitude}
            initialLng={selected.longitude}
            initialRadius={selected.radius_meters}
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
