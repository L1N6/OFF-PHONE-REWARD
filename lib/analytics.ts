// lib/analytics.ts
// TV2-2 — Analytics funnel (PURE). Suy số liệu trực tiếp từ focus_sessions +
// vouchers (count queries) — KHÔNG bảng event-log riêng (ADR-014). Mọi hàm
// thuần (không I/O, không Date.now()) → unit-test offline mọi biên.
//
// Funnel 4 bước (đơn điệu giảm dần):
//   Bắt đầu phiên → Qua Blind Box (sub_quest_passed) → Nhận voucher
//   (session COMPLETED) → Dùng tại quán (voucher REDEEMED).
// "Phase reach" (đạt Pha 2/3) KHÔNG có ở đây: phase là time-derived, không lưu
// per-session → cần event-log để đo chính xác (defer — xem ADR-014).

export type SessionCounts = {
  total: number; // tổng phiên đã tạo (mọi status)
  questPassed: number; // sub_quest_passed = TRUE
  running: number; // đang chạy
  completed: number; // đã nhận voucher (claim_voucher set COMPLETED)
  failed: number; // claim ngoài Giờ Vàng (OUTSIDE_WINDOW)
  expired: number; // RUNNING quá 48' → lazy-expiry
};

export type VoucherCounts = {
  available: number; // pool còn lại
  reserved: number; // đã cấp, chưa dùng tại quán
  redeemed: number; // đã dùng (POS validate)
};

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  pctOfStart: number; // % so với bước "Bắt đầu" (0–100, 1 chữ số thập phân)
  pctOfPrev: number; // % giữ lại so với bước liền trước (bước đầu = 100)
};

// % an toàn chia-0 → 0; làm tròn 1 chữ số thập phân.
export function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

// Funnel 4 bước. start = số phiên bắt đầu; mỗi bước tính % so với start và % giữ
// lại so với bước trước (insight rớt ở đâu nhiều nhất).
export function buildFunnel(s: SessionCounts, v: VoucherCounts): FunnelStage[] {
  const base = [
    { key: 'started', label: 'Bắt đầu phiên', count: s.total },
    { key: 'quest', label: 'Qua Blind Box', count: s.questPassed },
    { key: 'claimed', label: 'Nhận voucher', count: s.completed },
    { key: 'redeemed', label: 'Dùng tại quán', count: v.redeemed },
  ];
  const start = base[0].count;
  return base.map((st, i) => ({
    ...st,
    pctOfStart: pct(st.count, start),
    pctOfPrev: i === 0 ? 100 : pct(st.count, base[i - 1].count),
  }));
}

// Tỉ lệ chuyển đổi tổng: voucher đã dùng / tổng phiên bắt đầu.
export function conversionRate(s: SessionCounts, v: VoucherCounts): number {
  return pct(v.redeemed, s.total);
}

// Tổng voucher đã nạp vào pool (mọi trạng thái).
export function totalVouchers(v: VoucherCounts): number {
  return v.available + v.reserved + v.redeemed;
}
