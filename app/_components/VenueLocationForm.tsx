'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useFormState, useFormStatus } from 'react-dom';
import { updateVenueLocation } from '@/actions/updateVenueLocation';
import {
  getPosition,
  type GeoReason,
  type GeoLike,
} from '@/lib/geolocation';
import { RADIUS_MIN, RADIUS_MAX, parseNumber } from '@/lib/venueLocation';

// Bản đồ chọn toạ độ (TV2-14) — leaflet cần window → nạp client-only (ssr:false).
const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-border text-sm text-muted">
      Đang tải bản đồ…
    </div>
  ),
});

type GeoState =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'ok'; accuracy: number; lowAccuracy: boolean }
  | { kind: 'error'; reason: GeoReason };

const GEO_MESSAGE: Record<GeoReason, string> = {
  PERMISSION_DENIED: 'Bạn đã từ chối quyền vị trí. Hãy bật lại hoặc nhập tay bên dưới.',
  TIMEOUT: 'Lấy vị trí quá lâu. Thử lại hoặc nhập tay.',
  UNAVAILABLE: 'Không lấy được vị trí. Thử lại hoặc nhập tay.',
  UNSUPPORTED: 'Trình duyệt không hỗ trợ định vị. Vui lòng nhập tay.',
};

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-fg py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
    >
      {pending ? 'Đang lưu...' : 'Lưu vị trí'}
    </button>
  );
}

export default function VenueLocationForm({
  venueId,
  venueName,
  initialLat,
  initialLng,
  initialRadius,
}: {
  venueId: string;
  venueName: string;
  initialLat: number;
  initialLng: number;
  initialRadius: number;
}) {
  const [state, action] = useFormState(updateVenueLocation, {});
  const [lat, setLat] = useState(String(initialLat));
  const [lng, setLng] = useState(String(initialLng));
  const [radius, setRadius] = useState(String(initialRadius));
  const [geo, setGeo] = useState<GeoState>({ kind: 'idle' });

  async function captureGps() {
    setGeo({ kind: 'locating' });
    // navigator.geolocation khớp cấu trúc GeoLike → truyền thẳng (lib/geolocation luôn resolve).
    const nav =
      typeof navigator !== 'undefined'
        ? (navigator.geolocation as unknown as GeoLike | undefined)
        : undefined;
    const result = await getPosition(nav);
    if (result.ok) {
      // Toạ độ chỉ điền vào ô — KHÔNG tự lưu; user bấm "Lưu vị trí" để xác nhận.
      setLat(result.lat.toFixed(6));
      setLng(result.lng.toFixed(6));
      setGeo({ kind: 'ok', accuracy: Math.round(result.accuracy), lowAccuracy: result.lowAccuracy });
    } else {
      setGeo({ kind: 'error', reason: result.reason });
    }
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 sm:p-8 space-y-5">
      <div>
        <h2 className="font-semibold text-lg text-foreground">{venueName}</h2>
        <p className="text-xs text-muted mt-0.5">
          Đặt toạ độ + bán kính để guest claim voucher đúng tại quán.
        </p>
      </div>

      {/* GPS 1-click — chủ quán mở trang này TẠI quán */}
      <div>
        <button
          type="button"
          onClick={captureGps}
          disabled={geo.kind === 'locating'}
          className="w-full border border-primary/40 text-primary py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 hover:bg-primary/5 transition-colors"
        >
          {geo.kind === 'locating' ? '📍 Đang lấy vị trí...' : '📍 Lấy vị trí hiện tại'}
        </button>
        {geo.kind === 'ok' && (
          <p className={`text-xs mt-1.5 ${geo.lowAccuracy ? 'text-warn' : 'text-success'}`}>
            {geo.lowAccuracy
              ? `⚠️ Độ chính xác ~${geo.accuracy}m (hơi thấp) — kiểm tra lại hoặc chỉnh tay.`
              : `✓ Đã lấy vị trí (±${geo.accuracy}m). Bấm "Lưu vị trí" để áp dụng.`}
          </p>
        )}
        {geo.kind === 'error' && (
          <p className="text-xs mt-1.5 text-error">{GEO_MESSAGE[geo.reason]}</p>
        )}
      </div>

      {/* Bản đồ: tìm địa chỉ / click / kéo ghim → tự điền lat/lng (2 chiều với ô số dưới). */}
      <MapPicker
        lat={parseNumber(lat) ?? initialLat}
        lng={parseNumber(lng) ?? initialLng}
        radius={parseNumber(radius) ?? initialRadius}
        onPick={(pickedLat, pickedLng) => {
          setLat(pickedLat.toFixed(6));
          setLng(pickedLng.toFixed(6));
        }}
      />

      <form action={action} className="space-y-4">
        <input type="hidden" name="venue_id" value={venueId} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Vĩ độ (lat)</label>
            <input
              type="text"
              inputMode="decimal"
              name="latitude"
              required
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Kinh độ (lng)</label>
            <input
              type="text"
              inputMode="decimal"
              name="longitude"
              required
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Bán kính (mét)
          </label>
          <input
            type="number"
            name="radius_meters"
            required
            min={RADIUS_MIN}
            max={RADIUS_MAX}
            step={1}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted mt-1">
            {RADIUS_MIN}–{RADIUS_MAX}m. Gợi ý 20–50m cho quán nhỏ.
          </p>
        </div>

        {state.error && (
          <p className="text-sm text-error bg-error/10 border border-error/30 rounded-lg p-3">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-success bg-success/10 border border-success/30 rounded-lg p-3">
            ✓ Đã lưu. Vị trí có hiệu lực ngay cho lần claim tiếp theo.
          </p>
        )}

        <SaveBtn />
      </form>
    </div>
  );
}
