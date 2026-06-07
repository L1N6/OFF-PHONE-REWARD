import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { photonSearchUrl, parsePhotonResults } from '../lib/geosearch';

const CWD = process.cwd();

// ── pure: photonSearchUrl ────────────────────────────────────────────────────

test('photonSearchUrl: Photon endpoint + encode query + limit/lang', () => {
  const u = photonSearchUrl('Lê Lợi, Quận 1');
  assert.ok(u.startsWith('https://photon.komoot.io/api/?'), 'phải trỏ Photon (free, no key)');
  assert.ok(u.includes('limit=5'));
  assert.ok(u.includes('lang=default'));
  assert.ok(/q=L%C3%AA(\+|%20)L%E1%BB%A3i/.test(u), `query phải được encode: ${u}`);
});

// ── pure: parsePhotonResults ─────────────────────────────────────────────────

test('parsePhotonResults: GeoJSON Photon → list (coords [lng,lat] đảo đúng)', () => {
  const json = {
    type: 'FeatureCollection',
    features: [
      {
        geometry: { type: 'Point', coordinates: [106.7009, 10.7769] },
        properties: { name: 'Quán A', street: 'Lê Lợi', city: 'HCMC', country: 'Việt Nam' },
      },
      {
        geometry: { coordinates: [105.85, 21.02] },
        properties: { city: 'Hà Nội', country: 'Việt Nam' },
      },
      { geometry: { coordinates: ['x', 'y'] }, properties: {} }, // NaN → bỏ
      { properties: {} }, // thiếu geometry → bỏ
    ],
  };
  const r = parsePhotonResults(json);
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], {
    lat: 10.7769,
    lng: 106.7009,
    label: 'Quán A, Lê Lợi, HCMC, Việt Nam',
  });
  assert.equal(r[1].lat, 21.02);
  assert.equal(r[1].lng, 105.85);
  assert.equal(r[1].label, 'Hà Nội, Việt Nam');
});

test('parsePhotonResults: input rỗng/sai kiểu → []', () => {
  assert.deepEqual(parsePhotonResults(null), []);
  assert.deepEqual(parsePhotonResults({}), []);
  assert.deepEqual(parsePhotonResults({ features: 'nope' }), []);
  assert.deepEqual(parsePhotonResults('x'), []);
});

test('parsePhotonResults: thiếu name/street → label fallback toạ độ', () => {
  const r = parsePhotonResults({
    features: [{ geometry: { coordinates: [106.5, 10.5] }, properties: {} }],
  });
  assert.equal(r.length, 1);
  assert.equal(r[0].label, '10.50000, 106.50000');
});

// ── structural: MapPicker + wiring ───────────────────────────────────────────

test('MapPicker.tsx: leaflet + OSM + draggable + circle + Photon search', () => {
  const src = fs.readFileSync(path.join(CWD, 'app', '_components', 'MapPicker.tsx'), 'utf-8');
  assert.ok(src.includes("import('leaflet')"), 'phải nạp leaflet động (client-only)');
  assert.ok(src.includes('tile.openstreetmap.org'), 'phải dùng OSM tiles (no key)');
  assert.ok(src.includes('draggable: true'), 'ghim phải kéo được');
  assert.ok(src.includes('L.circle'), 'phải vẽ vòng tròn bán kính');
  assert.ok(src.includes('photonSearchUrl'), 'phải có tìm địa chỉ Photon');
  assert.ok(src.includes('onPick'), 'phải callback onPick(lat,lng)');
});

test('VenueLocationForm.tsx: nạp MapPicker qua dynamic ssr:false + wire onPick', () => {
  const src = fs.readFileSync(path.join(CWD, 'app', '_components', 'VenueLocationForm.tsx'), 'utf-8');
  assert.ok(src.includes("dynamic(() => import('./MapPicker')"), 'phải dynamic-import MapPicker');
  assert.ok(src.includes('ssr: false'), 'phải ssr:false (leaflet cần window)');
  assert.ok(src.includes('onPick'), 'phải wire onPick → setLat/setLng');
});
