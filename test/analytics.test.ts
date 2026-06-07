import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  pct,
  buildFunnel,
  conversionRate,
  totalVouchers,
  type SessionCounts,
  type VoucherCounts,
} from '../lib/analytics';

const CWD = process.cwd();

// ── pure: pct (chia-0 + làm tròn) ────────────────────────────────────────────

test('pct: chia-0 → 0, không NaN/Infinity', () => {
  assert.equal(pct(5, 0), 0);
  assert.equal(pct(0, 0), 0);
  assert.equal(pct(3, -1), 0);
});

test('pct: làm tròn 1 chữ số thập phân', () => {
  assert.equal(pct(1, 3), 33.3);
  assert.equal(pct(2, 3), 66.7);
  assert.equal(pct(1, 2), 50);
  assert.equal(pct(10, 10), 100);
});

// ── pure: buildFunnel ────────────────────────────────────────────────────────

const S: SessionCounts = {
  total: 100,
  questPassed: 60,
  running: 5,
  completed: 40,
  failed: 10,
  expired: 45,
};
const V: VoucherCounts = { available: 60, reserved: 15, redeemed: 25 };

test('buildFunnel: 4 bước đúng thứ tự + count map đúng nguồn', () => {
  const f = buildFunnel(S, V);
  assert.equal(f.length, 4);
  assert.deepEqual(
    f.map((s) => s.key),
    ['started', 'quest', 'claimed', 'redeemed']
  );
  assert.equal(f[0].count, 100); // total
  assert.equal(f[1].count, 60); // questPassed
  assert.equal(f[2].count, 40); // completed (claimed)
  assert.equal(f[3].count, 25); // voucher redeemed
});

test('buildFunnel: pctOfStart so với bước đầu, pctOfPrev so bước trước', () => {
  const f = buildFunnel(S, V);
  assert.equal(f[0].pctOfStart, 100);
  assert.equal(f[0].pctOfPrev, 100); // bước đầu luôn 100
  assert.equal(f[1].pctOfStart, 60); // 60/100
  assert.equal(f[1].pctOfPrev, 60); // 60/100
  assert.equal(f[2].pctOfStart, 40); // 40/100
  assert.equal(f[2].pctOfPrev, 66.7); // 40/60
  assert.equal(f[3].pctOfStart, 25); // 25/100
  assert.equal(f[3].pctOfPrev, 62.5); // 25/40
});

test('buildFunnel: total=0 → mọi % = 0, không crash', () => {
  const zero: SessionCounts = {
    total: 0,
    questPassed: 0,
    running: 0,
    completed: 0,
    failed: 0,
    expired: 0,
  };
  const f = buildFunnel(zero, { available: 0, reserved: 0, redeemed: 0 });
  assert.equal(f.length, 4);
  for (const s of f) assert.equal(s.count, 0);
  assert.equal(f[0].pctOfStart, 0);
  assert.equal(f[2].pctOfPrev, 0); // 0/0 → 0
});

test('conversionRate: redeemed / total', () => {
  assert.equal(conversionRate(S, V), 25); // 25/100
  assert.equal(conversionRate({ ...S, total: 0 }, V), 0);
});

test('totalVouchers: tổng 3 trạng thái', () => {
  assert.equal(totalVouchers(V), 100); // 60+15+25
  assert.equal(totalVouchers({ available: 0, reserved: 0, redeemed: 0 }), 0);
});

// ── structural: page + component + dashboard link ────────────────────────────

test('app/admin/venue/analytics/page.tsx: session-guard + ownership + count queries', () => {
  const p = path.join(CWD, 'app', 'admin', 'venue', 'analytics', 'page.tsx');
  assert.ok(fs.existsSync(p), 'thiếu analytics/page.tsx');
  const src = fs.readFileSync(p, 'utf-8');
  assert.ok(src.includes("redirect('/admin/login')"), 'phải redirect khi chưa session');
  assert.ok(src.includes('venue_admin_users'), 'phải resolve venue qua ownership');
  assert.ok(src.includes('supabase_uid'), 'ownership match supabase_uid (auth.uid())');
  assert.ok(src.includes('createAdminClient'), 'count query phải dùng createAdminClient (service_role)');
  assert.ok(src.includes("count: 'exact'") && src.includes('head: true'), 'phải dùng count head:true');
  assert.ok(src.includes('buildFunnel'), 'phải tính funnel qua lib/analytics');
  assert.ok(src.includes('AnalyticsDashboard'), 'phải render AnalyticsDashboard');
});

test('AnalyticsDashboard.tsx: render funnel + stat cards + status breakdown', () => {
  const src = fs.readFileSync(
    path.join(CWD, 'app', '_components', 'AnalyticsDashboard.tsx'),
    'utf-8'
  );
  assert.ok(src.includes('funnel.map'), 'phải render từng bước funnel');
  assert.ok(src.includes('pctOfStart'), 'bar width theo pctOfStart');
  assert.ok(src.includes('conversion'), 'phải hiện tỉ lệ chuyển đổi');
  assert.ok(/Trạng thái phiên/.test(src), 'phải có breakdown trạng thái phiên');
});

test('AdminDashboard có link tới /admin/venue/analytics', () => {
  const src = fs.readFileSync(
    path.join(CWD, 'app', '_components', 'AdminDashboard.tsx'),
    'utf-8'
  );
  assert.ok(src.includes('/admin/venue/analytics'), 'Dashboard phải có link Thống kê');
});
