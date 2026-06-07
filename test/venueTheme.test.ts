import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isValidThemeId, THEME_IDS } from '../lib/theme';

const CWD = process.cwd();

// ── pure: whitelist theme_id (action dùng để chặn input client) ──────────────

test('isValidThemeId chặn theme_id ngoài whitelist', () => {
  assert.equal(isValidThemeId('cozy_cafe'), true);
  assert.equal(isValidThemeId('lofi_night'), true);
  assert.equal(isValidThemeId('hacker_theme'), false);
  assert.equal(isValidThemeId(''), false);
  assert.equal(THEME_IDS.length, 4);
});

// ── structural: action + page + component ───────────────────────────────────

test('actions/updateVenueTheme.ts: use server + whitelist + ownership + merge JSONB', () => {
  const src = fs.readFileSync(path.join(CWD, 'actions', 'updateVenueTheme.ts'), 'utf-8');
  assert.ok(src.includes("'use server'"), 'phải có "use server"');
  assert.ok(src.includes('export async function updateVenueTheme'), 'thiếu export updateVenueTheme');
  assert.ok(src.includes('isValidThemeId'), 'phải validate theme_id qua whitelist (không tin client)');
  assert.ok(src.includes('venue_admin_users'), 'phải verify ownership qua venue_admin_users');
  assert.ok(src.includes('supabase_uid'), 'ownership match supabase_uid (auth.uid())');
  assert.ok(src.includes('createAdminClient'), 'UPDATE phải dùng createAdminClient (service_role)');
  assert.ok(src.includes('getSession'), 'phải check session');
  assert.ok(src.includes('theme_id'), 'phải merge theme_id vào branding');
});

test('app/admin/venue/theme/page.tsx tồn tại + redirect khi chưa login', () => {
  const p = path.join(CWD, 'app', 'admin', 'venue', 'theme', 'page.tsx');
  assert.ok(fs.existsSync(p), 'thiếu page.tsx');
  const src = fs.readFileSync(p, 'utf-8');
  assert.ok(src.includes("redirect('/admin/login')"), 'page phải redirect khi chưa session');
  assert.ok(src.includes('VenueThemeForm'), 'page phải render VenueThemeForm');
  assert.ok(src.includes('parseBranding'), 'page phải lấy theme hiện tại qua parseBranding');
});

test('VenueThemeForm.tsx: lưới preset + live preview + wire updateVenueTheme', () => {
  const src = fs.readFileSync(path.join(CWD, 'app', '_components', 'VenueThemeForm.tsx'), 'utf-8');
  assert.ok(src.includes('updateVenueTheme'), 'phải wire action updateVenueTheme');
  assert.ok(src.includes('THEME_IDS'), 'phải render lưới preset từ THEME_IDS');
  assert.ok(src.includes('ThemePreview') || src.includes('linear-gradient'), 'phải có live preview mockup');
  assert.ok(src.includes('name="theme_id"'), 'phải submit theme_id đã chọn');
});

test('AdminDashboard có link tới /admin/venue/theme', () => {
  const src = fs.readFileSync(path.join(CWD, 'app', '_components', 'AdminDashboard.tsx'), 'utf-8');
  assert.ok(src.includes('/admin/venue/theme'), 'Dashboard phải có link Chọn theme');
});
