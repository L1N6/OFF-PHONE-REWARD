# deploy.md — T0-4 Deployment Runbook

> Hướng dẫn dựng **Supabase** + **Vercel** cho Off-Phone Rewards.
> Các bước dashboard cần tài khoản của bạn (agent không tự đăng nhập được).
> Sau khi xong, T0-4 hoàn thành + đóng nợ **D-014** (live-connect test) và **D-015** (apply schema thật).

Repo: `github.com/L1N6/OFF-PHONE-REWARD` (branch `main`). Stack: Next.js 14 · Supabase · Vercel.

---

## Bước 1 — Supabase project

1. Vào https://supabase.com → **New project** (region gần VN, vd **Singapore**). Đặt mật khẩu DB và lưu lại.
2. Mở **SQL Editor** → New query:
   - Dán toàn bộ `supabase/schema.sql` → **Run** (tạo 6 bảng + ENUM + index + function `claim_voucher`).
   - Dán toàn bộ `supabase/seed.sql` → **Run** (1 venue + 20 voucher).
3. **Lưu ý pgcrypto:** Supabase đã bật sẵn `pgcrypto` ở schema `extensions`. `seed.sql` đã `SET search_path TO public, extensions` nên `crypt()` resolve được. Nếu vẫn lỗi `function crypt does not exist` → chạy `create extension if not exists pgcrypto with schema extensions;` rồi Run lại seed.

### Lấy credentials
| Lấy ở đâu (Dashboard) | Dùng cho env |
|---|---|
| Settings → API → **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| Settings → API → **anon public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Settings → API → **service_role** (secret!) | `SUPABASE_SERVICE_ROLE_KEY` |
| Settings → Database → Connection string → **Transaction pooler** (port **6543**) | *(chỉ cần nếu sau này thêm kết nối Postgres trực tiếp — migrations/seed script. supabase-js KHÔNG cần, xem `lib/supabase.ts`)* |

---

## Bước 2 — Env vars

5 biến (xem `.env.example`). `NEXT_PUBLIC_*` lộ ra client (an toàn); 3 biến còn lại là **secret** (chỉ server).

| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Bước 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (🔒 secret) |
| `VENUE_ID` | `11111111-1111-1111-1111-111111111111` (từ seed) |
| `CASHIER_BYPASS_CODE` | tự đặt, vd `OFF-PHONE-2026` (🔒 secret) |

**Local:** `cp .env.example .env.local` rồi điền. `.env.local` đã bị `.gitignore` chặn — KHÔNG commit.

---

## Bước 3 — Verify local (đóng D-014 + D-015)

```bash
npm run verify:supabase   # env đủ + venue + 20 voucher + RPC claim_voucher OK
npm test                  # kỳ vọng 6 PASS, 0 SKIP (live-connect chạy được)
```
Cả hai PASS = schema/seed/creds đúng.

---

## Bước 4 — Vercel

1. https://vercel.com → **Add New → Project** → **Import** `github.com/L1N6/OFF-PHONE-REWARD`.
2. Framework **Next.js** (auto-detect). Root `./`. Build/Output để mặc định (zero-config).
3. **Environment Variables:** thêm cả 5 biến ở Bước 2 cho **Production + Preview + Development**.
   - `NEXT_PUBLIC_*` cần có lúc **build** (được inline vào client bundle).
4. **Deploy** → nhận Production URL.
5. **Xác nhận auto-deploy:** đảm bảo code đã push lên `main` (xem dưới) → mỗi `git push main` Vercel tự build lại.

### Push code lên GitHub (để Vercel deploy đúng bản mới nhất)
Hiện `lib/`, `test/`, `supabase/`, `scripts/` + cập nhật `package.json`/docs **chưa commit**. Trước khi deploy:
```bash
git add -A
git commit -m "session: T0-4 deploy scaffolding (schema/clients/scripts)"
git push origin main
```

---

## Checklist T0-4 (khớp todo.md)
- [ ] Project live trên Vercel URL
- [ ] Env vars set trong Vercel dashboard (5 biến)
- [ ] Auto-deploy từ `git push main` hoạt động
- [ ] `npm run verify:supabase` + `npm test` PASS (đóng D-014, D-015)

## Bảo mật
- `service_role` key + `CASHIER_BYPASS_CODE` là **secret** → chỉ đặt ở `.env.local` (local) và Vercel env. `.gitignore` đã chặn `.env*.local`.
- Nếu lỡ commit secret → rotate key ngay trên Supabase dashboard.
