import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  validateLocationInput,
  parseNumber,
  describeLocationError,
  LAT_MIN,
  LAT_MAX,
  LNG_MIN,
  LNG_MAX,
  RADIUS_MIN,
  RADIUS_MAX,
} from '../lib/venueLocation';

const CWD = process.cwd();

// ── pure: parseNumber ────────────────────────────────────────────────────────

test('parseNumber: số, chuỗi, dấu phẩy thập phân, rỗng/sai → null', () => {
  assert.equal(parseNumber(10.5), 10.5);
  assert.equal(parseNumber('10.5'), 10.5);
  assert.equal(parseNumber(' 10,5 '), 10.5); // dấu phẩy VN
  assert.equal(parseNumber('-90'), -90);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('   '), null);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber(null), null);
  assert.equal(parseNumber(NaN), null);
  assert.equal(parseNumber(Infinity), null);
});

// ── pure: validateLocationInput ──────────────────────────────────────────────

test('validateLocationInput: input hợp lệ → ok + radius làm tròn', () => {
  const r = validateLocationInput({ lat: '10.7769', lng: '106.7009', radius: '20' });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.lat, 10.7769);
    assert.equal(r.lng, 106.7009);
    assert.equal(r.radius, 20);
  }
});

test('validateLocationInput: radius thập phân → làm tròn (SMALLINT)', () => {
  const r = validateLocationInput({ lat: 0, lng: 0, radius: '20.6' });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.radius, 21);
});

test('validateLocationInput: biên hợp lệ -90/90/-180/180/10/500 đều ok', () => {
  for (const [lat, lng, radius] of [
    [LAT_MIN, LNG_MIN, RADIUS_MIN],
    [LAT_MAX, LNG_MAX, RADIUS_MAX],
  ] as const) {
    const r = validateLocationInput({ lat, lng, radius });
    assert.equal(r.ok, true, `biên (${lat},${lng},${radius}) phải hợp lệ`);
  }
});

test('validateLocationInput: lat ngoài [-90,90] → LAT_OUT_OF_RANGE', () => {
  assert.deepEqual(validateLocationInput({ lat: 90.1, lng: 0, radius: 20 }), {
    ok: false,
    error: 'LAT_OUT_OF_RANGE',
  });
  assert.deepEqual(validateLocationInput({ lat: -90.1, lng: 0, radius: 20 }), {
    ok: false,
    error: 'LAT_OUT_OF_RANGE',
  });
});

test('validateLocationInput: lng ngoài [-180,180] → LNG_OUT_OF_RANGE', () => {
  assert.deepEqual(validateLocationInput({ lat: 0, lng: 180.5, radius: 20 }), {
    ok: false,
    error: 'LNG_OUT_OF_RANGE',
  });
});

test('validateLocationInput: radius ngoài [10,500] → RADIUS_OUT_OF_RANGE', () => {
  assert.deepEqual(validateLocationInput({ lat: 0, lng: 0, radius: 9 }), {
    ok: false,
    error: 'RADIUS_OUT_OF_RANGE',
  });
  assert.deepEqual(validateLocationInput({ lat: 0, lng: 0, radius: 501 }), {
    ok: false,
    error: 'RADIUS_OUT_OF_RANGE',
  });
});

test('validateLocationInput: thiếu/không phải số → NOT_A_NUMBER', () => {
  assert.deepEqual(validateLocationInput({ lat: '', lng: '0', radius: '20' }), {
    ok: false,
    error: 'NOT_A_NUMBER',
  });
  assert.deepEqual(validateLocationInput({ lat: 'abc', lng: 0, radius: 20 }), {
    ok: false,
    error: 'NOT_A_NUMBER',
  });
});

test('describeLocationError: mọi mã có message tiếng Việt', () => {
  for (const code of [
    'LAT_OUT_OF_RANGE',
    'LNG_OUT_OF_RANGE',
    'RADIUS_OUT_OF_RANGE',
    'NOT_A_NUMBER',
  ] as const) {
    const msg = describeLocationError(code);
    assert.equal(typeof msg, 'string');
    assert.ok(msg.length > 0, `message rỗng cho ${code}`);
  }
});

// ── structural: action + page + component tồn tại đúng pattern ────────────────

test('actions/updateVenueLocation.ts: use server + ownership check + admin client', () => {
  const src = fs.readFileSync(path.join(CWD, 'actions', 'updateVenueLocation.ts'), 'utf-8');
  assert.ok(src.includes("'use server'"), 'phải có "use server"');
  assert.ok(src.includes('export async function updateVenueLocation'), 'thiếu export updateVenueLocation');
  assert.ok(src.includes('venue_admin_users'), 'phải verify quyền qua venue_admin_users');
  assert.ok(src.includes('supabase_uid'), 'ownership phải match supabase_uid (auth.uid())');
  assert.ok(src.includes('createAdminClient'), 'UPDATE phải dùng createAdminClient (service_role)');
  assert.ok(src.includes('validateLocationInput'), 'phải validate biên server-side');
  assert.ok(src.includes("getSession"), 'phải check session (đăng nhập)');
});

test('app/admin/venue/location/page.tsx tồn tại + redirect khi chưa login', () => {
  const p = path.join(CWD, 'app', 'admin', 'venue', 'location', 'page.tsx');
  assert.ok(fs.existsSync(p), 'thiếu page.tsx');
  const src = fs.readFileSync(p, 'utf-8');
  assert.ok(src.includes("redirect('/admin/login')"), 'page phải redirect /admin/login khi chưa có session');
  assert.ok(src.includes('VenueLocationForm'), 'page phải render VenueLocationForm');
});

test('VenueLocationForm.tsx: GPS 1-click + wire updateVenueLocation', () => {
  const src = fs.readFileSync(path.join(CWD, 'app', '_components', 'VenueLocationForm.tsx'), 'utf-8');
  assert.ok(src.includes('getPosition'), 'phải dùng getPosition (GPS capture)');
  assert.ok(src.includes('updateVenueLocation'), 'phải wire action updateVenueLocation');
  assert.ok(src.includes('radius_meters'), 'phải có input radius_meters');
});
