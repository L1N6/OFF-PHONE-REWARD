// app/_components/AnalyticsDashboard.tsx
// TV2-2 — render funnel + thống kê (presentational thuần, không state/effect →
// không cần 'use client'). Dữ liệu đã tính server-side (page) qua lib/analytics.

import type { FunnelStage, SessionCounts, VoucherCounts } from '@/lib/analytics';
import { totalVouchers } from '@/lib/analytics';

type Props = {
  venueName: string;
  funnel: FunnelStage[];
  sessions: SessionCounts;
  vouchers: VoucherCounts;
  conversion: number;
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

export default function AnalyticsDashboard({
  venueName,
  funnel,
  sessions,
  vouchers,
  conversion,
}: Props) {
  const hasData = sessions.total > 0;
  const poolTotal = totalVouchers(vouchers);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{venueName}</h2>
        <p className="text-sm text-muted mt-0.5">Tổng quan phễu chuyển đổi & kho voucher</p>
      </div>

      {!hasData && (
        <div className="bg-surface rounded-2xl border border-border p-6 text-center text-muted">
          <p className="text-lg">Chưa có phiên nào.</p>
          <p className="text-sm mt-1">Số liệu sẽ xuất hiện sau khi khách bắt đầu phiên đầu tiên.</p>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Phiên bắt đầu" value={String(sessions.total)} />
        <StatCard
          label="Tỉ lệ chuyển đổi"
          value={`${conversion}%`}
          hint="voucher dùng / phiên"
        />
        <StatCard
          label="Voucher đã dùng"
          value={String(vouchers.redeemed)}
          hint={`${vouchers.reserved} đang giữ`}
        />
        <StatCard
          label="Kho còn lại"
          value={String(vouchers.available)}
          hint={`/${poolTotal} tổng`}
        />
      </div>

      {/* ── Funnel ─────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Phễu chuyển đổi</h3>
        <div className="space-y-4">
          {funnel.map((stage, i) => (
            <div key={stage.key}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-foreground">{stage.label}</span>
                <span className="text-sm text-muted">
                  <span className="font-semibold text-foreground">{stage.count}</span>
                  {' · '}
                  {stage.pctOfStart}%
                  {i > 0 && (
                    <span className="text-xs text-muted">
                      {' '}
                      (giữ {stage.pctOfPrev}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${stage.pctOfStart}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status breakdown ───────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Trạng thái phiên</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{sessions.running}</p>
            <p className="text-xs text-muted mt-0.5">Đang chạy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-success">{sessions.completed}</p>
            <p className="text-xs text-muted mt-0.5">Hoàn tất</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-error">{sessions.failed}</p>
            <p className="text-xs text-muted mt-0.5">Thất bại</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-muted">{sessions.expired}</p>
            <p className="text-xs text-muted mt-0.5">Hết hạn</p>
          </div>
        </div>
      </div>
    </div>
  );
}
