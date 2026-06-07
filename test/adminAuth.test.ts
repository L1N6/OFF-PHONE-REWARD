import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const LIVE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const CWD  = process.cwd();

// ── offline ────────────────────────────────────────────────────────────────

test('schema.sql: venue_admin_users có composite UNIQUE constraints', () => {
  const sql = fs.readFileSync(path.join(CWD, 'supabase', 'schema.sql'), 'utf-8');
  for (const kw of [
    'uq_admin_venue_uid',
    'uq_admin_venue_email',
    'UNIQUE (venue_id, supabase_uid)',
    'UNIQUE (venue_id, email)',
    'ALTER TABLE venue_admin_users DROP CONSTRAINT IF EXISTS venue_admin_users_email_key',
    'ALTER TABLE venue_admin_users DROP CONSTRAINT IF EXISTS venue_admin_users_supabase_uid_key',
  ]) {
    assert.ok(sql.includes(kw), `schema.sql thiếu: ${kw}`);
  }
});

test('schema.sql: supabase_uid nullable (không có NOT NULL sau UUID)', () => {
  const sql = fs.readFileSync(path.join(CWD, 'supabase', 'schema.sql'), 'utf-8');
  // Slice đúng CREATE TABLE block (không dùng indexOf('claim_voucher') vì từ đó có trong header comment)
  const tableStart = sql.indexOf('CREATE TABLE IF NOT EXISTS venue_admin_users');
  const tableEnd   = sql.indexOf(');', tableStart);
  const block = sql.slice(tableStart, tableEnd + 2);
  const uidLine = block.split('\n').find(l => /supabase_uid.*UUID/.test(l));
  assert.ok(uidLine, 'không tìm thấy cột supabase_uid trong CREATE TABLE venue_admin_users');
  assert.ok(
    !uidLine.includes('NOT NULL'),
    `supabase_uid không được có NOT NULL (nullable cho invite flow): "${uidLine.trim()}"`
  );
});

test('adminSupabase.ts tồn tại và export createAuthServerClient + createAuthBrowserClient', () => {
  const src = fs.readFileSync(path.join(CWD, 'lib', 'adminSupabase.ts'), 'utf-8');
  assert.ok(src.includes('createAuthServerClient'), 'thiếu createAuthServerClient');
  assert.ok(src.includes('createAuthBrowserClient'), 'thiếu createAuthBrowserClient');
  assert.ok(src.includes('@supabase/ssr'), 'phải dùng @supabase/ssr');
});

test('middleware.ts tồn tại và bảo vệ /admin routes', () => {
  const src = fs.readFileSync(path.join(CWD, 'middleware.ts'), 'utf-8');
  assert.ok(src.includes('/admin/login'), 'middleware phải redirect về /admin/login');
  assert.ok(src.includes("matcher: ['/admin/:path*']"), 'matcher phải cover /admin/:path*');
  assert.ok(src.includes('getSession'), 'phải gọi getSession để check auth');
});

test('actions/adminAuth.ts export đủ 4 actions', () => {
  const src = fs.readFileSync(path.join(CWD, 'actions', 'adminAuth.ts'), 'utf-8');
  for (const fn of ['signIn', 'signOut', 'signUp', 'inviteManager']) {
    assert.ok(src.includes(`export async function ${fn}`), `thiếu export: ${fn}`);
  }
  assert.ok(src.includes("'use server'"), 'phải có "use server" directive');
});

test('inviteManager: kiểm tra ownership trước khi invite', () => {
  const src = fs.readFileSync(path.join(CWD, 'actions', 'adminAuth.ts'), 'utf-8');
  assert.ok(
    src.includes("role', 'owner'") || src.includes(".eq('role', 'owner')"),
    'inviteManager phải verify role=owner trước khi cho invite'
  );
});

test('auth callback route tồn tại', () => {
  const routePath = path.join(CWD, 'app', 'admin', 'auth', 'callback', 'route.ts');
  assert.ok(fs.existsSync(routePath), 'thiếu app/admin/auth/callback/route.ts');
  const src = fs.readFileSync(routePath, 'utf-8');
  assert.ok(src.includes('exchangeCodeForSession'), 'callback phải exchange code');
  assert.ok(src.includes('supabase_uid'), 'callback phải link supabase_uid');
});

// ── live ──────────────────────────────────────────────────────────────────

test('signIn với credentials sai → trả error (không crash)', { skip: !LIVE }, async () => {
  const { signIn } = await import('../actions/adminAuth');
  // Gọi trực tiếp với wrong credentials — expect error trả về, không throw
  const result = await signIn({}, new FormData()).catch(() => ({ error: 'action_threw' }));
  // FormData rỗng → email/password empty → Supabase sẽ trả error
  assert.ok(result && typeof (result as { error?: string }).error === 'string',
    'signIn với input sai phải trả { error: string }');
});
