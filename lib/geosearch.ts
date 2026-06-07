/**
 * Geocoding search (TV2-14, RQ-003) — PURE, test offline.
 *
 * Dùng Photon (komoot, nền OpenStreetMap): FREE, KHÔNG cần API key, có CORS + autocomplete.
 * `photonSearchUrl` build URL; `parsePhotonResults` đổi GeoJSON FeatureCollection → list điểm.
 * Không phụ thuộc DOM/leaflet → unit-test bằng mock JSON.
 */

export interface GeoSearchResult {
  lat: number;
  lng: number;
  label: string;
}

// Photon `lang` chỉ nhận default|en|de|fr|it → dùng 'default' (tên theo ngôn ngữ địa phương).
export function photonSearchUrl(query: string, limit = 5, lang = "default"): string {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    lang,
  });
  return `https://photon.komoot.io/api/?${params.toString()}`;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** GeoJSON Photon → GeoSearchResult[]. coordinates = [lng, lat]. Bỏ feature thiếu toạ độ. */
export function parsePhotonResults(json: unknown): GeoSearchResult[] {
  const features = (asRecord(json).features ?? []) as unknown[];
  if (!Array.isArray(features)) return [];

  const out: GeoSearchResult[] = [];
  for (const f of features) {
    const feat = asRecord(f);
    const geom = asRecord(feat.geometry);
    const coords = geom.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const p = asRecord(feat.properties);
    const parts = [p.name, p.street, p.district, p.city, p.state, p.country]
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    const label = parts.length > 0 ? parts.join(", ") : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    out.push({ lat, lng, label });
  }
  return out;
}
