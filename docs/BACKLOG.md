# BACKLOG.md — Feature Pipeline
# Off-Phone Rewards · Luồng từ ý tưởng → task → done

> File này là **intake zone** cho yêu cầu mới chưa có trong todo.md.
> Khi yêu cầu đã được thiết kế xong → graduate lên todo.md thành task có ID.
> Fast-follow 🟡 và V2 🔵 đã có trong todo.md — xem ở đó, không ghi lại ở đây.

---

## Luồng xử lý yêu cầu mới

```
1. User mô tả ý tưởng/vấn đề
        ↓
2. Claude đọc: PRD.md (tầm nhìn) + specs.md (kỹ thuật hiện tại) + ADR.md (quyết định cũ)
        ↓
3. Claude tạo entry [RQ-xxx] trong BACKLOG.md với template dưới
        ↓
4. User duyệt: OK / điều chỉnh
        ↓
5. Claude cập nhật specs.md (schema mới / logic mới nếu cần)
        ↓
6. Claude tạo task [TF-x hoặc TV2-x] trong todo.md với Checklist đầy đủ
        ↓
7. Gõ OK → PLAYBOOK chạy 4 phases (Plan → Code → Validate → Save)
        ↓
8. Claude cập nhật HISTORY.md + đóng entry BACKLOG.md
```

**Lệnh để bắt đầu intake:**
```
Tôi có yêu cầu mới: [mô tả ngắn gọn]
```
Claude sẽ đọc PRD + specs + BACKLOG rồi tạo entry draft để bạn duyệt trước khi code.

---

## Template yêu cầu mới

```markdown
### [RQ-xxx] Tên tính năng
**Tag:** 🟡 Fast-follow / 🔵 V2 / 🟢 Hotfix
**Ngày tạo:** YYYY-MM-DD
**Status:** draft → ready → in-progress → done

**Vấn đề / nhu cầu:**
[Người dùng gặp gì? Quán cần gì? Business muốn gì?]

**Giải pháp đề xuất:**
[Mô tả UX + logic — không cần chi tiết kỹ thuật, đó là việc của specs.md]

**Acceptance criteria:**
- [ ] ...
- [ ] ...

**Ràng buộc kỹ thuật (liên quan ADR nào):**
[ADR-xxx — ...]

**Câu hỏi mở cần chốt trước khi code:**
- [ ] ...

**Deps (task nào phải xong trước):**
[TF-x / TV2-x]

**→ Tasks tạo ra:** [IDs sau khi graduate vào todo.md]
**→ Specs thay đổi:** [Section nào trong specs.md]
```

---

## Pre-pilot Checklist (trước khi deploy thật)

> Những thứ tạm bỏ qua khi test local — PHẢI xử lý trước khi có khách thật.

- [x] **Xoá dev GPS bypass** trong `actions/claimVoucher.ts` ✅ Session 31
- [x] **Đổi hằng số thời gian** về giá trị thật trong `lib/sessionStatus.ts` (`900/2100/2700/2880`) và `supabase/schema.sql` lazy-expiry (`> 2880`) ✅ Session 31
- [ ] **Apply `schema.sql`** đầy đủ lên Supabase (bao gồm `validate_voucher`) → đóng skip live cuối (`npm test` → 85/0/0)
- [ ] **Đổi đáp án Blind Box** khỏi `"1234"` (D-002) — UPDATE `sub_quest_config` trong Supabase
- [ ] **Toạ độ venue thật** (latitude/longitude seed hiện là HCMC placeholder) + `radius_meters` thực tế (~20m)
- [ ] **`git push`** → Vercel auto-deploy
- [ ] Smoke test thủ công trên điện thoại thật tại quán (GPS/vibrate/audio)

---

## Backlog đang xem xét

### [RQ-001] Venue owner tự cấu hình vị trí quán qua UI
**Tag:** 🟡 Fast-follow (chặn scale multi-venue)
**Ngày tạo:** 2026-06-05
**Status:** ready

**Vấn đề:**
Khi nhân rộng ra nhiều quán, mỗi chủ quán mua sản phẩm nhưng không thể tự
cài đặt vị trí GPS của quán mình — hiện phải nhờ kỹ sư chạy SQL thủ công.
Không thể scale nếu mỗi quán mới cần developer can thiệp.

**Giải pháp đề xuất:**

_Cơ chế phân quyền: Owner + Manager per venue_
```
Owner (tạo tài khoản tự do, sở hữu nhiều venue)
  └── Venue A  ← invite Manager A (chỉ thấy/sửa venue này)
  └── Venue B  ← invite Manager B
  └── Venue C  ← tự quản lý
```
- **Owner**: đăng ký email/password (Supabase Auth thuần, không OAuth), tạo venue,
  invite manager, xem tất cả venue mình own.
- **Manager**: nhận email invite → tạo tài khoản → chỉ thấy/sửa venue được giao.
  Không thể invite thêm người.
- `venue_admin_users.role`: `owner` | `manager` — schema đã có sẵn.

_Trang `/admin/venue/location` (scope RQ-001 — chỉ location):_
- Nút **"Lấy vị trí hiện tại"** (Geolocation API, chủ quán mở tại quán) → tự điền lat/lng
- Hoặc nhập tay lat/lng (GPS indoor kém chính xác)
- Chỉnh `radius_meters` (input số, gợi ý 20–50m)
- Nút **Lưu** → UPDATE `venues` SET latitude/longitude/radius_meters
- Branding (màu/tên): tách task riêng sau

**Acceptance criteria:**
- [ ] Owner/Manager tự set toạ độ — không cần kỹ sư chạy SQL
- [ ] Owner chỉ sửa venue của mình; Manager chỉ sửa venue được giao (RLS)
- [ ] Owner có thể tạo nhiều venue và invite manager cho từng venue
- [ ] Sau khi lưu, GPS claim của khách tại quán hoạt động đúng ngay
- [ ] Validation: lat ∈ [-90,90] · lng ∈ [-180,180] · radius ∈ [10,500]
- [ ] Nút "Lấy vị trí hiện tại" hoạt động đúng trên mobile (chủ quán dùng tại quán)

**Ràng buộc kỹ thuật:**
- ADR-001: schema `venues` + `venue_admin_users` đã có đủ — không cần migration mới
- ADR-008: Geolocation API ở đây dùng để SET config (owner action có auth),
  khác hoàn toàn với guest claim flow
- **TF-4 (RLS) PHẢI xong trước** — không có RLS thì owner A sửa được venue B
- Supabase Auth email/password (không OAuth) — `venue_admin_users.supabase_uid` link tới Auth

**Deps:** TF-4 (RLS) → TV2-1 (Auth + invite flow) → **TV2-10** (venue location UI)
**→ Tasks:** TV2-1 (mở rộng scope) · TV2-10 (mới) ✅ graduated 2026-06-05
**→ Specs thay đổi:** §1.6 (schema fix + role logic) · §4 Module 5 (mới) · §5 RLS (UPDATE policy venues) ✅

---

### [RQ-002] Design system thống nhất + Admin chọn theme cho layout
**Tag:** 🔵 V2 (polish/branding — có thể kéo sớm vì nâng "cảm giác" pilot)
**Ngày tạo:** 2026-06-05
**Status:** ✅ done (Session 35–37 — TV2-11/12/13)
**Chốt đề xuất:** admin trung tính (chỉ guest đổi theme) · POS trung tính tương phản cao · Pha 3 giữ dark · 4 preset (custom màu để sau) · font **giữ Geist self-host** (thay Be Vietnam Pro — tránh fetch sau proxy) · default = Cozy Cafe (giữ teal/amber, tránh đụng ấn phẩm) · tách 2 đợt (α → β+γ).

**Vấn đề / nhu cầu:**
Giao diện hiện **không đồng bộ**: luồng khách (Landing/Session/BlindBox/Meditation/Voucher) dùng tông
teal `#0F766E` + amber `#F59E0B` (đọc inline từ `venues.branding`), còn admin (Login/Register/Dashboard/
VenueLocation) dùng **blue-600 + gray** kiểu corporate, POS `/validate` lại tông riêng. Không có design
token chung (`globals.css` mới chỉ có trắng/đen + `prefers-color-scheme`, font còn là **Arial mặc định**;
`tailwind.config` chưa khai báo màu thương hiệu). Kết quả: ba mảng trông như ba app khác nhau.
Cần một ngôn ngữ thiết kế **thân thiện, gần gũi cho độ tuổi 15–40** (người trẻ ngồi cafe), và admin
**chọn được theme cho layout** để mỗi quán cảm thấy sản phẩm là của họ.

**Giải pháp đề xuất (chia 3 task khi graduate):**

_α) Design-system foundation — "thân thiện/cozy" + token hoá:_
- Khai báo **design token** dạng CSS variables (`--color-primary/accent/surface/bg/text/muted` + semantic
  `success/warn/error`) ở `globals.css`, map vào `tailwind.config` (`theme.extend.colors`) → component dùng
  `bg-primary` thay vì `#0F766E` cứng hoặc `bg-blue-600`.
- **Typography**: thay Arial bằng 1 font bo tròn thân thiện hỗ trợ tiếng Việt đầy đủ dấu
  (đề xuất **Be Vietnam Pro** hoặc **Nunito**). Bo góc `rounded-2xl`, shadow mềm, spacing thoáng,
  tap-target lớn (mobile-first) — phần lớn đã theo hướng này, chỉ chuẩn hoá.
- **Restyle toàn bộ surface** về cùng token: guest + POS + admin. Default theme = **"Cozy Cafe"**.

_β) Theme presets + resolver:_
- `lib/theme.ts`: định nghĩa N preset `{ id, name, primary, accent, surface, bg, mascot, font? }` +
  `resolveTheme(theme_id)` → token. Guest app đọc `venues.branding.theme_id` → áp token (CSS vars trên `<html>`).
- Đề xuất **4 preset** (khớp tinh thần PRD §4.1 theme_id):
  1. **Cozy Cafe** (default) — teal ấm + amber, ☕ · trung tính, quen thuộc
  2. **Vương quốc Mèo** — coral/peach `#FF9F7B` (đúng PRD), 🐱 · vui tươi
  3. **Sách & Acoustic** — sage + kem, 📖 · trầm, tĩnh
  4. **Lo-fi Night** — indigo/tím dịu, 🌙 · buổi tối/học bài

_γ) Admin theme picker UI:_
- Trang `/admin/venue/theme` (anh em với `/admin/venue/location`): lưới card preset + **live preview**
  (mockup điện thoại mini) → chọn → `updateVenueTheme(venueId, themeId)` Server Action → lưu
  `branding.theme_id`. Reuse pattern ADR-011 (service_role + ownership `venue_admin_users`) y như TV2-10.
- **Hiệu lực ngay** cho guest sau khi lưu (đọc branding live).

**Acceptance criteria:**
- [x] Guest + Admin + POS dùng CHUNG design token (hết `#hex` cứng / `bg-blue-600`) — TV2-11
- [x] Tông tổng thể thân thiện, bo tròn, font (Geist) tiếng Việt — nhất quán 3 mảng — TV2-11
- [x] Admin có trang chọn theme với 4 preset + live preview trước khi lưu — TV2-13
- [x] Chọn theme → luồng khách venue đổi màu/mascot ngay (đọc `branding.theme_id` live) — TV2-12/13
- [x] Quyền: chỉ owner/manager venue mới đổi được theme (ADR-011) — TV2-13
- [x] Không vỡ test (viết lại `branding.test.ts` cho themeId) — 123/0/0

**Ràng buộc kỹ thuật (ADR liên quan):**
- **Không cần migration** — `venues.branding` là JSONB đã tồn tại (ADR-001); chỉ thêm key `theme_id`.
- **ADR-011** — `updateVenueTheme` dùng service_role + ownership check (như `updateVenueLocation`).
- **Inv #7 (mock-first)**: preview theme trong admin dùng mock; guest áp theme thật.
- Đụng `lib/branding.ts` (mở rộng `Branding` + `themeId`), `globals.css`, `tailwind.config`, `app/layout.tsx`
  (font), và ~12 component (restyle) → refactor cross-cutting, rủi ro regression hình ảnh (test curl chỉ
  check copy/structural, không check màu pixel).

**Câu hỏi mở cần chốt trước khi code:**
- [ ] **Admin UI có đổi theme theo lựa chọn không**, hay giữ trung tính (vì 1 owner quản nhiều venue)?
      *Đề xuất:* admin giữ tông trung tính-thân thiện cố định; chỉ **luồng khách (+POS?)** đổi theo theme venue.
- [ ] **POS `/validate`** áp theme venue hay giữ tương phản cao trung tính cho thu ngân dễ đọc?
      *Đề xuất:* trung tính tương phản cao.
- [ ] **Số lượng & danh sách preset** cho pilot — dùng 4 đề xuất ở trên? Có cần ô **chọn màu tự do** ngay
      không hay để sau? *Đề xuất:* 4 preset, custom-color để V-sau.
- [ ] **Đổi font** sang Be Vietnam Pro/Nunito (thêm 1 font) — OK chứ, hay giữ system font chỉ restyle?
- [ ] **Đổi default palette** có đụng standee/ấn phẩm vật lý đã in (phải khớp màu) không?
- [ ] **Pha 3 Meditation** giữ nguyên dark/tĩnh "đã thiết kế" bất kể theme? *Đề xuất:* giữ nguyên.
- [ ] **Rollout**: làm α (1 theme đồng bộ) trước rồi β+γ (presets + picker) sau — OK tách 2 đợt?

**Deps:** TV2-1 ✅ + TV2-10 ✅ (admin shell + pattern ownership đã có). Không chặn bởi gì khác.
**→ Tasks:** **TV2-11** (design-system + restyle, đợt α) · **TV2-12** (theme presets + resolver, đợt β) · **TV2-13** (admin theme picker, đợt γ) ✅ graduated 2026-06-05
**→ Specs thay đổi:** §4 Module 6 mới (`updateVenueTheme`) ✅ · §9 "Design System & Theming" mới (tokens + 4 preset + branding contract + no-flash) ✅

---

### [RQ-003] Chọn toạ độ venue bằng bản đồ tương tác (map picker)
**Tag:** 🔵 V2 (admin UX — cải thiện onboarding/scale)
**Ngày tạo:** 2026-06-05
**Status:** ✅ done (Session 38 — TV2-14)
**Chốt:** Leaflet + OSM (KHÔNG API key) · search Photon (autocomplete free) · vòng tròn bán kính · giữ GPS + nhập tay fallback. → ADR-013.

**Vấn đề / nhu cầu:**
Trang `/admin/venue/location` (TV2-10) hiện bắt chủ quán **gõ tay lat/lng** (hoặc bấm "Lấy vị trí hiện tại"
khi đang đứng ở quán). Gõ số thập phân toạ độ rất khó, dễ sai, không trực quan — và nút GPS chỉ đúng khi
chủ quán mở TẠI quán. Cần cách **chọn nhanh + chính xác** điểm quán trên bản đồ.

**Giải pháp đề xuất:**
Nhúng **bản đồ tương tác** vào form location:
- Bản đồ hiển thị marker tại toạ độ hiện tại của venue (initialLat/Lng).
- **Kéo marker / click lên bản đồ** → tự điền lat/lng (2 chiều: ô số ↔ marker đồng bộ).
- (Tùy chọn) **ô tìm địa chỉ** (geocoding) → nhảy bản đồ tới nơi đó.
- (Tùy chọn) **vòng tròn bán kính** vẽ theo `radius_meters` → chủ quán thấy vùng claim thực tế.
- **Giữ nguyên** nút "Lấy vị trí hiện tại" (GPS) + ô nhập tay làm fallback (khi map lỗi/không tải được).
- Lưu vẫn qua `updateVenueLocation` cũ — **không đổi backend/schema**.

**Acceptance criteria:**
- [x] Bản đồ tương tác; kéo/click ghim → lat/lng cập nhật (2 chiều với ô số) — `MapPicker`
- [x] Marker khởi tạo đúng vị trí venue; chỉnh radius → vòng tròn đổi theo (`L.circle.setRadius`)
- [x] Mobile OK (leaflet touch/drag) — render verify khi chạy browser
- [x] Map lỗi/chưa tải → `dynamic` loading fallback + ô nhập tay/GPS độc lập (không chặn lưu)
- [x] Lưu vẫn qua `updateVenueLocation` (validate biên cũ) — KHÔNG đổi schema
- [x] + tìm địa chỉ (Photon, free) — vượt yêu cầu tối thiểu

**Ràng buộc kỹ thuật (ADR liên quan):**
- Map library chạy **client-only** → `dynamic(() => ..., { ssr: false })` (cần `window`).
- **ADR-007 (proxy):** thư viện/tile tải ở TRÌNH DUYỆT (dùng Windows cert store) → thường OK; khác với Node SSR-fetch bị chặn. Local dev xem map có thể cần mạng thường; production (máy chủ quán) không bị.
- **Google Maps cần `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** (GCP có billing; free credit ~$200/tháng đủ cho lưu lượng nhỏ; restrict theo HTTP referrer). **Leaflet + OpenStreetMap KHÔNG cần key, miễn phí** (geocoding qua Nominatim free, rate-limit).
- Không đổi `venues` schema (vẫn lat/lng/radius) — chỉ thêm UI tầng client.

**Câu hỏi mở cần chốt trước khi code:**
- [ ] **Google Maps hay Leaflet/OpenStreetMap?** *Đề xuất pilot: Leaflet + OSM* — miễn phí, không cần API key/billing/setup, đủ cho "click bản đồ chọn toạ độ". Chọn **Google** nếu muốn ô tìm địa chỉ Places mượt + UX quen thuộc (đổi lại: cần key + billing). Bạn đã có sẵn Google Maps API key chưa?
- [ ] **Cần ô tìm địa chỉ (search)** không, hay chỉ kéo/click marker là đủ? *(search Google Places = tốt nhất nhưng cần key; Nominatim/OSM = free nhưng giới hạn tốc độ; bỏ search = đơn giản nhất)*
- [ ] **Vẽ vòng tròn bán kính** trên map (đồng bộ `radius_meters`) — làm luôn hay để sau?
- [ ] Nếu Google: **ai cấp/quản lý API key + billing**? (cần trước khi code phần Google)

**Deps:** TV2-10 ✅ (trang location + `updateVenueLocation` đã có). Không chặn bởi gì khác.
**→ Tasks:** (sau khi duyệt) đề xuất **TV2-14** — Map picker cho venue location.
**→ Specs thay đổi:** §4 Module 5 (bổ sung "chọn toạ độ trên bản đồ" vào luồng lấy vị trí).

---

### [RQ-004] Pivot cơ chế: "Trọng tài ngầm" — úp máy / khóa màn hình thay cho game on-screen
**Tag:** 🟢 Core pivot (re-scope luồng LÕI — KHÔNG phải feature nhỏ)
**Ngày tạo:** 2026-06-06
**Status:** draft

**Vấn đề / nhu cầu:**
Cơ chế hiện tại (3 pha: Sudoku → Blind Box → Meditation) vô tình **giữ mắt khách trên màn hình** để "neo sự chú ý" — đúng như PRD §2.2 mô tả Pha 1: *"neo sự chú ý của khách tại trang, ngăn thoát sang app khác"* — **mâu thuẫn** với mục tiêu rời màn hình, hiện diện đời thực. Các tính năng game (Sudoku, Blind Box nhiều loại, Meditation) cũng làm **phình code + phình vận hành** (cấu hình quest, đặt vật thể, rotate đáp án). Mong muốn: hệ thống lùi về làm **"trọng tài ngầm" không chạm** — khách chỉ cần **úp máy / khóa màn hình 45 phút**, không tương tác số; hết giờ → lật máy → GPS check → voucher. Bỏ game thừa, tập trung tối ưu **logic chống gian lận**.

**Giải pháp đề xuất (theo `docs/FLOW_IDEA.md`):**
- Landing → START → xin quyền **cảm biến góc nghiêng** (DeviceOrientation) **hoặc** định vị.
- Màn "ÚP MÁY XUỐNG BÀN ĐỂ BẮT ĐẦU" → phát hiện máy úp (hoặc màn khóa) → bắt đầu đếm 45'.
- 45' tập trung: máy úp/khóa, không tương tác số. **Server là nguồn thời gian** (đã có — Inv #1).
- Hết giờ: tín hiệu vật lý (hộp cơ tại bàn — phần cứng, ngoài scope) HOẶC chuông điện thoại.
- Lật máy → màn chúc mừng tự hiện → **GPS check tại quán** → voucher độc bản.
- **Bỏ:** Sudoku (Pha 1) · Blind Box + `validateSubQuest`/`get_active_quests`/`sub_quest_config` · Meditation (Pha 3) · gate `sub_quest_passed` trong `claim_voucher`.

**⚠️ Mâu thuẫn với PRD (north star) — phải chốt:**
1. **PRD §1.2** ghi rõ: *"'Offline từ mạng xã hội' — KHÔNG phải 'tắt điện thoại'... vẫn cần giữ trình duyệt chạy để đếm giờ"*; bảng "Tránh dùng" liệt kê **chính** *"Không chạm điện thoại"* / *"Úp máy xuống"* là cách **nên tránh**. Pivot này **đảo ngược** triết lý → phải sửa PRD §1.2/§1.4 (hoặc override có chủ đích).
2. **Blind Box** (PRD Phần III) là "tâm điểm trải nghiệm thương hiệu" + trụ **Brand Identity Amplifier** (§1.3d) + doanh thu **Sổ Nhật Ký** (§6.1 Luồng 2) + điểm khác biệt cốt lõi (§1.1). Bỏ Blind Box = **bỏ luôn các trụ này** → quyết định KINH DOANH, không chỉ kỹ thuật.

**🔴 Giới hạn kỹ thuật cốt tử (hiểu trước khi chốt):**
Web app **KHÔNG thể giám sát liên tục 45' khi màn hình tắt / máy úp**:
- Màn khóa/tắt → trình duyệt **đóng băng JS** (timer dừng), tab có thể bị evict. `DeviceOrientation`/`DeviceMotion` **chỉ bắn khi tab foreground + màn sáng**.
- **KHÔNG có Web API đọc trực tiếp "đã khóa màn hình".** Chỉ có proxy `visibilitychange`/`document.hidden` — bắn `hidden` khi khóa máy **HOẶC** chuyển app **HOẶC** đổi tab → **không phân biệt** "úp máy yên" với "mở Instagram".
- Giữ màn sáng để đo gyro liên tục (`WakeLock`) → **ngược ý "úp máy/khóa"** + hao pin; nhiều máy úp xuống tự tắt màn (proximity).
- iOS 13+ bắt `DeviceOrientationEvent.requestPermission()` từ user-gesture + HTTPS.

→ **Hệ quả:** đo tin cậy được **(a) thời điểm úp máy START** + **(b) lật máy + GPS để FINISH** + **(c) đếm gián đoạn cơ hội** (mỗi `visibilitychange→visible` / máy lật lên = 1 lần "động máy"). KHÔNG đảm bảo tuyệt đối máy úp suốt 45'. Anti-cheat thực tế = **server-time + ngưỡng số lần gián đoạn → FAIL** (giống `infraction_count` hiện tại nhưng nâng từ "cảnh báo mềm" thành "cổng cứng").

**Acceptance criteria (nháp — chốt sau khi duyệt):**
- [ ] START chỉ kích hoạt khi phát hiện máy úp (gyro beta≈180°/gamma) hoặc màn chuyển hidden.
- [ ] Đồng hồ 45' do server quyết (Inv #1) — lật/khóa không làm mất giờ đã trôi.
- [ ] Lật máy giữa chừng / mở app khác → ghi gián đoạn; vượt ngưỡng N → phiên FAIL (hoặc reset).
- [ ] Hết 45' + còn trong vùng GPS → cấp voucher (bỏ điều kiện `sub_quest_passed`).
- [ ] Fallback khi cảm biến/quyền không có (Inv #4): visibility-based hoặc hướng dẫn thủ công.
- [ ] Bỏ sạch UI/logic Sudoku + Blind Box + Meditation; test liên quan gỡ/viết lại; build không vỡ.

**Ràng buộc kỹ thuật (ADR liên quan):**
- **ADR-008** (server-time phase) GIỮ; phase machine đơn giản hoá: `WAITING_FACEDOWN → FOCUS → CLAIMABLE`.
- **Inv #1** server-time là xương sống. **Inv #4** mở rộng (vibrate → cả sensor/permission fallback). **Inv #5** audio gate cho chuông hết giờ (lưu ý: chuông khó phát khi màn khóa).
- **ADR-009** (BlindBox-in-CLAIMABLE) → **superseded** (Blind Box bị bỏ).
- Cần **ADR mới**: mô hình anti-cheat "sensor + interruption counting + server-time" + ghi rõ **giới hạn không-đảm-bảo-liên-tục**.
- Schema: giữ phần lớn (focus_sessions/vouchers/venues). `sub_quest_config` deprecate (giữ cột). `infraction_count` đổi vai trò soft→hard. Cân nhắc log thời điểm gián đoạn hoặc tái dùng `infraction_count`.

**Câu hỏi mở cần chốt trước khi code:**
- [ ] **Thay thế hoàn toàn hay chế độ song song?** Bỏ hẳn Blind Box/Sudoku/Meditation, hay giữ làm "chế độ B" cho quán muốn brand experience? *(Đề xuất: muốn tối giản → thay hoàn toàn, đánh dấu Blind Box deprecated.)*
- [ ] **Chấp nhận đánh đổi PRD?** Pivot bỏ Brand Amplifier (§1.3d) + doanh thu Sổ Nhật Ký (§6.1 L2) + khác biệt "Blind Box theo quán". OK đổi north star sang "presence thuần / không chạm"?
- [ ] **Anti-cheat: chấp nhận "không đảm bảo liên tục"?** Mô hình khả thi = server-time + đếm gián đoạn + GPS. Ngưỡng bao nhiêu lần động máy / tổng thời gian "visible" trước khi FAIL? Có cho "đặt lại" khi lỡ chạm?
- [ ] **Tín hiệu chính = cảm biến hay khóa-màn-hình?** Gyro (cần màn sáng — hao pin, ngược "úp máy") vs visibility/lock (không phân biệt lý do hidden). *(Đề xuất: gyro để START → visibility theo dõi gián đoạn.)*
- [ ] **Tín hiệu hết giờ:** hộp vật lý (phần cứng — ai làm?) / chuông phần mềm (rủi ro không kêu khi màn khóa) / khách tự lật máy (màn tự hiện CLAIMABLE khi đủ giờ)?
- [ ] **Copy/định vị marketing** đổi theo? (PRD §1.2 "Gác lại mạng xã hội" → "Úp máy 45 phút").

**Deps:** Không chặn bởi task chưa làm (lõi session/timer/GPS/claim/POS đã có). Nhưng **đụng diện rộng** (viết lại SessionView, bỏ nhiều component/RPC) → nên tách **vài task** khi graduate.
**→ Tasks (đề xuất sau khi duyệt):** (1) đơn giản hoá phase machine + bỏ game UI · (2) sensor/permission + màn "úp máy" START · (3) anti-cheat interruption + ngưỡng FAIL · (4) bỏ gate sub_quest trong claim + cập nhật copy.
**→ Specs thay đổi:** §2.2 (3 pha → state mới) · §3 Blind Box (deprecate) · §4 Module 2 (phase + interruption) · §4 Module 3 (claim bỏ sub_quest gate) · **PRD §1.2/§1.4/Phần III (amend north star)**.

---

## Đã graduate → todo.md

> Các yêu cầu đã được thiết kế và thêm vào todo.md — xem todo.md để track tiến độ.

| Entry | Task trong todo.md | Ngày |
|---|---|---|
| (Fast-follow từ Session 0) | TF-1..TF-5 | 2026-06-03 |
| (V2 từ Session 0) | TV2-1..TV2-9 | 2026-06-03 |
| RQ-001 | TV2-10 ✅ | 2026-06-05 |
| RQ-002 | TV2-11 ✅ · TV2-12 ✅ · TV2-13 ✅ | 2026-06-05 |
| RQ-003 | TV2-14 ✅ | 2026-06-05 |
