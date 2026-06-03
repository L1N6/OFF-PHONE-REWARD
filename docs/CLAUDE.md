# CLAUDE.md — Off-Phone Rewards
# Đọc file này đầu tiên trong mọi session.

## Startup
1. Read @docs/PLAYBOOK.md và @docs/HISTORY.md → paste Lệnh 1 trong PLAYBOOK
2. PLAYBOOK tự điều phối mọi thứ — không cần đọc file khác trước

## Nguồn sự thật (đọc kỹ)
- **@docs/specs.md** = hợp đồng kỹ thuật DUY NHẤT cho bản build. PRD lệch specs.md → **specs.md thắng** (phần kỹ thuật).
- **@docs/off-phone-rewards-PRD-v3.1.md** = tầm nhìn sản phẩm/kinh doanh (north star, không sửa khi code).
- Scope chốt: **Hybrid — nền móng scale-ready, pilot tinh gọn.** Tag trong specs.md: 🟢 MVP · 🟡 Fast-follow (trước quán trả phí) · 🔵 V2. **Chỉ làm 🟢 trong MVP.**

## Project
O2O gamified loyalty: khách cafe đặt điện thoại 45 phút → nhận voucher 10%.  
Stack: Next.js 14 App Router · TypeScript · Tailwind · Supabase PostgreSQL · Vercel

## Cấu trúc
```
CLAUDE.md          ← file này (đọc đầu tiên)
docs/
  PLAYBOOK.md      ← orchestrator: 2 lệnh + 4 phases tự động
  HISTORY.md       ← anchor: trạng thái hiện tại + session log
  specs.md         ← nguồn kỹ thuật DUY NHẤT: schema + logic (Phase A+C đọc)
  todo.md          ← 25 task MVP (tag 🟢) + Fast-follow + V2 (Phase A+D đọc)
  scratch/         ← file tạm handoff (gitignore *.md)
app/ actions/ lib/ hooks/ supabase/
```

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VENUE_ID=
CASHIER_BYPASS_CODE=
```
```bash
npm install && cp .env.example .env.local && npm run dev
```

## 8 Invariants — vi phạm bất kỳ = Phase C reject, quay Phase B sửa

| # | Rule | Detail |
|---|---|---|
| 1 | SERVER TIME | Không Date.now() / new Date().getDay() cho business logic. Chỉ Postgres NOW() (weekday: NOW() AT TIME ZONE venue.timezone). |
| 2 | ATOMIC VOUCHER | Logic đa-bước-nguyên-tử = 1 Postgres function (RPC), gọi 1 lần. FOR UPDATE SKIP LOCKED. Không BEGIN/COMMIT trải nhiều query từ Node (pooler transaction-mode). |
| 3 | NO AUTH | Không login/signup/OAuth trong user flow. |
| 4 | IOS VIBRATE | navigator.vibrate silent fail Safari → luôn có visual fallback. |
| 5 | AUDIO GATE | Lo-fi audio chỉ sau user gesture (START button). |
| 6 | IDEMPOTENT | Bảo chứng ở TẦNG DB (unique index), không app-check: uniq_running_session + uniq_voucher_per_session. Gọi 2 lần → cùng kết quả. |
| 7 | MOCK FIRST | FE dùng mock data trước khi wire BE thật. |
| 8 | TEST PASS | Test phải pass trước khi khai báo task xong (gồm test race claim đồng thời). |
