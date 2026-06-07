'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { inviteManager } from '@/actions/adminAuth';

type Venue = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  active: boolean;
  role: string;
};

function InviteBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm bg-primary text-primary-fg px-4 py-1.5 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
    >
      {pending ? 'Đang gửi...' : 'Gửi invite'}
    </button>
  );
}

function InviteForm({ venueId }: { venueId: string }) {
  const [state, action] = useFormState(inviteManager, {});

  if (state.success) {
    return (
      <p className="text-sm text-success mt-2">
        ✓ Đã gửi invite. Manager sẽ nhận email trong vài phút.
      </p>
    );
  }

  return (
    <form action={action} className="mt-3 flex gap-2 items-start flex-wrap">
      <input type="hidden" name="venue_id" value={venueId} />
      <div className="flex-1 min-w-0">
        <input
          type="email"
          name="email"
          required
          placeholder="email@manager.com"
          className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {state.error && <p className="text-xs text-error mt-1">{state.error}</p>}
      </div>
      <InviteBtn />
    </form>
  );
}

export default function AdminDashboard({ venues }: { venues: Venue[] }) {
  if (venues.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-lg">Chưa có venue nào được gán cho tài khoản này.</p>
        <p className="text-sm mt-1">Liên hệ admin để được thêm vào venue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {venues.map((venue) => (
        <div key={venue.id} className="bg-surface rounded-2xl shadow-sm border border-border p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-lg text-foreground">{venue.name}</h2>
              <p className="text-xs text-muted mt-0.5">
                {venue.role === 'owner' ? '👑 Owner' : '👤 Manager'}
                {' · '}
                {venue.latitude.toFixed(5)}, {venue.longitude.toFixed(5)}
                {' · '}
                {venue.radius_meters}m
                {!venue.active && ' · ⚠️ Inactive'}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                venue.active
                  ? 'bg-success/15 text-success'
                  : 'bg-muted/15 text-muted'
              }`}
            >
              {venue.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="mt-3 flex gap-4">
            <Link
              href={`/admin/venue/location?venue=${venue.id}`}
              className="text-sm text-primary font-medium hover:underline"
            >
              📍 Cấu hình vị trí
            </Link>
            <Link
              href={`/admin/venue/theme?venue=${venue.id}`}
              className="text-sm text-primary font-medium hover:underline"
            >
              🎨 Chọn theme
            </Link>
            <Link
              href={`/admin/venue/analytics?venue=${venue.id}`}
              className="text-sm text-primary font-medium hover:underline"
            >
              📊 Thống kê
            </Link>
          </div>

          {/* Invite manager — chỉ owner */}
          {venue.role === 'owner' && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">
                Invite Manager
              </p>
              <InviteForm venueId={venue.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
