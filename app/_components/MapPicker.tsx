'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { photonSearchUrl, parsePhotonResults, type GeoSearchResult } from '@/lib/geosearch';

// Toạ độ fallback khi prop chưa hợp lệ (HCMC) — chỉ để khởi tạo map, không lưu.
const FALLBACK: [number, number] = [10.7769, 106.7009];
const PRIMARY = '#0F766E';

type Props = {
  lat: number;
  lng: number;
  radius: number;
  onPick: (lat: number, lng: number) => void;
};

/**
 * MapPicker (TV2-14, RQ-003) — bản đồ tương tác chọn toạ độ. Leaflet + OSM tiles (KHÔNG key).
 * Render client-only (nạp qua next/dynamic ssr:false ở VenueLocationForm — leaflet cần window).
 * Click/kéo ghim → onPick(lat,lng). Vòng tròn = radius_meters. Ô tìm địa chỉ qua Photon (free).
 */
export default function MapPicker({ lat, lng, radius, onPick }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const onPickRef = useRef(onPick);
  const roRef = useRef<ResizeObserver | null>(null);
  const skipRecenter = useRef(false); // true khi cập nhật đến TỪ kéo ghim → không re-center
  const [ready, setReady] = useState(false);

  // search state
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onPickRef.current = onPick;

  // Khởi tạo map MỘT lần.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import('leaflet');
      const L =
        (mod as unknown as { default?: typeof Leaflet }).default ??
        (mod as unknown as typeof Leaflet);
      if (cancelled || !divRef.current || mapRef.current) return;

      const start: [number, number] = [
        Number.isFinite(lat) ? lat : FALLBACK[0],
        Number.isFinite(lng) ? lng : FALLBACK[1],
      ];
      const map = L.map(divRef.current).setView(start, 17);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // divIcon (📍) → tránh bug asset marker-icon.png mặc định của Leaflet dưới bundler.
      const icon = L.divIcon({
        className: 'opr-map-pin',
        html: '<div style="font-size:30px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
      const marker = L.marker(start, { draggable: true, icon }).addTo(map);
      const circle = L.circle(start, {
        radius: Number.isFinite(radius) ? radius : 20,
        color: PRIMARY,
        fillColor: PRIMARY,
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);

      marker.on('dragend', () => {
        const p = marker.getLatLng();
        skipRecenter.current = true;
        onPickRef.current(p.lat, p.lng);
      });
      map.on('click', (e: Leaflet.LeafletMouseEvent) => {
        skipRecenter.current = false;
        onPickRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
      setReady(true);

      // Tile chỉ render đúng khi container đã có kích thước thật. Container nạp động
      // (dynamic/ssr:false) có thể chưa settle lúc init → invalidateSize sau khi ready + mỗi lần
      // container đổi kích thước (responsive/mobile) → tránh "tile lệch / chỉ hiện 1 góc".
      map.whenReady(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 0);
      setTimeout(() => map.invalidateSize(), 250);
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(divRef.current);
      roRef.current = ro;
    })();

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ marker/vòng tròn/view khi lat/lng đổi từ ngoài (GPS / nhập tay / search).
  useEffect(() => {
    if (!ready || !markerRef.current || !mapRef.current) return;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const ll: [number, number] = [lat, lng];
      markerRef.current.setLatLng(ll);
      circleRef.current?.setLatLng(ll);
      if (!skipRecenter.current) mapRef.current.setView(ll, mapRef.current.getZoom());
    }
    skipRecenter.current = false;
  }, [lat, lng, ready]);

  // Vòng tròn theo radius_meters.
  useEffect(() => {
    if (ready && circleRef.current && Number.isFinite(radius)) {
      circleRef.current.setRadius(radius);
    }
  }, [radius, ready]);

  // Tìm địa chỉ (Photon) — debounce 400ms, tối thiểu 3 ký tự.
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    const query = q.trim();
    if (query.length < 3) {
      setResults([]);
      return;
    }
    debRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(photonSearchUrl(query));
        setResults(parsePhotonResults(await res.json()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [q]);

  const pick = (r: GeoSearchResult) => {
    setResults([]);
    setQ(r.label);
    skipRecenter.current = false;
    onPickRef.current(r.lat, r.lng);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Tìm địa chỉ quán…"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {(results.length > 0 || searching) && (
          <ul className="absolute z-[1000] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-surface text-sm shadow-lg">
            {searching && <li className="px-3 py-2 text-muted">Đang tìm…</li>}
            {results.map((r, i) => (
              <li key={`${r.lat}-${r.lng}-${i}`}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="block w-full px-3 py-2 text-left hover:bg-primary/5"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        ref={divRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-border"
        role="application"
        aria-label="Bản đồ chọn vị trí quán"
      />
      <p className="text-xs text-muted">
        Bấm lên bản đồ hoặc kéo ghim 📍 để chọn điểm quán. Vòng tròn = bán kính nhận voucher.
      </p>
    </div>
  );
}
