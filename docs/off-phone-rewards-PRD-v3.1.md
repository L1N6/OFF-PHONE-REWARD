# OFF-PHONE REWARDS
## Tài liệu Đặc tả Sản phẩm & Kỹ thuật — PRD v3.1

> | Phiên bản | Thay đổi chính |
> |---|---|
> | V2.0 | Đặc tả kỹ thuật gốc |
> | V2.1 | Revenue model, OTP bypass, Sub-quest rotation, Device fingerprint |
> | V3.0 | Tài liệu tổng hợp — viết lại toàn bộ |
> | **V3.1** | **Thêm: Concept-Driven Blind Box, Scale Architecture, Admin UI spec, RLS, POS API** |

---

## MỤC LỤC

**Phần I — Tổng quan Sản phẩm**
- 1.1 Tuyên bố Mục tiêu
- 1.2 Triết lý Sản phẩm
- 1.3 Mô hình Kinh tế học O2O
- 1.4 Triết lý Vận hành Không chạm
- 1.5 Kiến trúc Scale — Đánh giá & Lộ trình

**Phần II — Trải nghiệm Người dùng**
- 2.1 Luồng Người dùng
- 2.2 Máy Trạng thái 3 Pha

**Phần III — Concept-Driven Blind Box** *(Tính năng mới)*
- 3.1 Triết lý thiết kế Nhiệm vụ
- 3.2 Bộ loại Nhiệm vụ (Mission Type Catalog)
- 3.3 Mẫu Nhiệm vụ theo Mô hình Quán
- 3.4 Sổ Nhật Ký Người Lạ

**Phần IV — Kiến trúc Kỹ thuật**
- 4.1 Mô hình Dữ liệu
- 4.2 Đặc tả Server Actions
- 4.3 Bảo mật Multi-tenant (Row-Level Security)

**Phần V — Vận hành & An toàn**
- 5.1 Xử lý Ngoại lệ & Dự phòng
- 5.2 Quản trị Rủi ro & Gian lận

**Phần VI — Kinh doanh**
- 6.1 Mô hình Doanh thu & Định giá
- 6.2 Chiến lược Go-to-Market

**Phần VII — Triển khai**
- 7.1 Phạm vi MVP
- 7.2 Câu hỏi Mở cần Làm rõ

---

## PHẦN I — TỔNG QUAN SẢN PHẨM

### 1.1 Tuyên bố Mục tiêu

**Off-Phone Rewards** là nền tảng trò chơi hóa O2O (Online-to-Offline) phi tập trung, không can thiệp phần cứng, được thiết kế đặc biệt cho không gian F&B.

Hệ thống khuyến khích khách hàng tại quán cafe, co-working space tạm gác lại mạng xã hội, hiện diện trọn vẹn với không gian thực trong 45 phút. Đổi lại, họ nhận được ưu đãi giảm giá từ thương hiệu.

Điểm khác biệt cốt lõi so với các công cụ khuyến mãi thông thường: mỗi quán có thể cấu hình một **Blind Box nhiệm vụ riêng** phản ánh bản sắc thương hiệu của họ — từ quán mèo, quán sách, đến cafe acoustic. Hệ thống không chỉ đếm giờ mà tạo ra những khoảnh khắc có chủ đề, đáng nhớ, có thể được chia sẻ tự nhiên.

---

### 1.2 Triết lý Sản phẩm

#### "Offline từ mạng xã hội" — không phải "tắt điện thoại"

Người dùng vẫn cần giữ trình duyệt web chạy để đếm giờ. Sản phẩm không yêu cầu tắt điện thoại hoàn toàn — mà tạo ra **khoảnh khắc hiện diện có chủ ý**: thoát khỏi vòng lặp cuộn mạng xã hội, đặt máy xuống, kết nối lại với không gian và con người xung quanh.

Nguyên tắc này phải nhất quán trong toàn bộ copy marketing và giao diện:

| Tránh dùng | Nên dùng |
| :--- | :--- |
| *"Rời xa màn hình điện thoại 45 phút"* | *"Gác lại mạng xã hội 45 phút"* |
| *"Không chạm điện thoại"* | *"Úp máy xuống, tập trung vào không gian thực"* |
| *"Off your phone completely"* | *"Offline from social. Present in the moment."* |

---

### 1.3 Mô hình Kinh tế học O2O

Hệ thống giải quyết bài toán lợi ích đôi bên giữa khách hàng và chủ quán thông qua bốn trục giá trị:

#### a) Voucher như chi phí Marketing, không phải giảm lợi nhuận
Ngành F&B có biên lợi nhuận gộp trung bình ~70%. Voucher giảm giá 10–15% là chi phí thu hút khách hàng (CAC), nằm trong biên độ an toàn của dòng tiền quán.

#### b) Tối ưu tốc độ xoay vòng bàn — có điều kiện
Hiệu ứng này chỉ thực sự có giá trị với phân khúc phù hợp:

| Phân khúc khách | Thời gian ở lại | Tác động |
| :--- | :--- | :--- |
| **Quick stop** (< 30 phút) | Ngắn hơn 45 phút | ❌ Challenge kéo dài thời gian → Turnover **giảm** |
| **Work-from-cafe** (2–3 giờ) | Dài hơn nhiều | ➖ Trung tính |
| **Social hang** (60–90 phút lướt mạng) | Phần lớn thụ động | ✅ Challenge tạo điểm kết thúc tự nhiên tại phút 45–48 |

**Kết luận:** Off-Phone Rewards là công cụ **tạo điểm kết thúc có thưởng** (rewarded exit point), hiệu quả nhất với phân khúc Social hang. Khi pitch với chủ quán, cần định vị đúng phân khúc thay vì quảng bá chung chung.

#### c) Kích cầu tiêu dùng tại chỗ
Trạng thái ngắt kết nối sau 15–30 phút kích thích cảm giác buồn miệng/khát tự nhiên → khách gọi thêm món thứ hai.

#### d) Khuếch đại nhận diện thương hiệu (Brand Identity Amplifier) *(Tính năng v3.1)*
Thông qua hệ thống Blind Box, mỗi nhiệm vụ được thiết kế theo bản sắc riêng của quán. Khách hàng không chỉ nhận voucher — họ trải nghiệm một câu chuyện về thương hiệu. Điều này tạo ra:
- Kỷ niệm có chủ đề, khác biệt so với các lần ghé thăm thông thường
- Nội dung chia sẻ tự phát (User-generated content): ảnh chụp mèo, câu chép từ sách, cảm nhận về bài nhạc
- Lý do quay lại: *"Tuần này nhiệm vụ là gì nhỉ?"*

---

### 1.4 Triết lý Vận hành Không chạm

Hệ thống không tạo thêm gánh nặng vận hành cho nhân viên quầy:
- **Không giải thích luật chơi:** Toàn bộ quy trình qua một mã QR với thông điệp duy nhất: *"Úp điện thoại 45 phút = Giảm 10% ly tiếp theo"*.
- **Tự động hóa 100%:** Logic đếm giờ, chuyển pha, phát hành voucher — tất cả do ứng dụng web xử lý.
- **Nhân viên tham gia hai điểm duy nhất:** (1) Tạo OTP bypass khi khách gặp sự cố GPS — 5 giây. (2) Xác thực mã voucher tại quầy POS — 3 giây.

---

### 1.5 Kiến trúc Scale — Đánh giá & Lộ trình

#### Những gì đã sẵn sàng cho scale

| Thành phần | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| Multi-tenant (venue_id khắp nơi) | ✅ Sẵn sàng | Kiến trúc tách biệt dữ liệu từ đầu |
| Serverless auto-scale (Vercel + Supabase) | ✅ Sẵn sàng | Không cần provision server thủ công |
| Race condition prevention (FOR UPDATE SKIP LOCKED) | ✅ Sẵn sàng | Xử lý concurrent claims |
| JSONB config cho venue (không cần migrate schema khi thêm tính năng) | ✅ Sẵn sàng | Linh hoạt khi mở rộng Blind Box |

#### Ba điểm chặn thực sự khi scale

**Điểm chặn 1 — Admin UI:** Hiện tại bị defer sang sau MVP. Tắc nghẽn bắt đầu từ venue thứ 5 trở đi khi kỹ sư phần mềm phải thao tác database thủ công cho từng quán. Bắt buộc phải build trước khi bước sang Giai đoạn 1 GTM.

**Điểm chặn 2 — Row-Level Security:** Chưa có spec. Ở quy mô nhiều venue, admin của quán A không được phép đọc/ghi dữ liệu của quán B. Supabase RLS là công cụ đúng nhưng cần thiết kế policy rõ ràng (xem Mục 4.3).

**Điểm chặn 3 — POS API Integration:** Chuỗi F&B (Gói Chain) không muốn sử dụng giao diện web riêng để xác thực voucher — họ muốn tích hợp thẳng vào hệ thống POS đang dùng (KiotViet, Sapo). Cần thiết kế REST API endpoint xác thực voucher (`POST /api/v1/vouchers/redeem`) và cơ chế API key theo venue.

---

## PHẦN II — TRẢI NGHIỆM NGƯỜI DÙNG

### 2.1 Luồng Người dùng

Mô hình **Zero-Friction Onboarding**: không bắt buộc tải ứng dụng, không bắt buộc đăng ký tài khoản.

```
[Khách quét mã QR tại bàn]
           │
           ▼
[Landing Page: Giới thiệu ưu đãi & Luật chơi]
  ─── Hệ thống tự sinh guest_token ngầm + thu thập device fingerprint
           │
           ▼
[Bấm START CHALLENGE]
  ─── Kích hoạt User Gesture → unlock AudioContext (xử lý autoplay)
  ─── Giao diện chuyển màu sắc theo theme của quán (branding config)
           │
           ▼
   ┌────────────────────────────────────────────────────┐
   │              VÒNG ĐỜI THỬ THÁCH 45 PHÚT           │
   │                                                    │
   │  Pha 1 (0–15')   → Mini-game Sudoku / Mật mã      │
   │  Pha 2 (15–35')  → Blind Box: Nhiệm vụ thực tế    │
   │  Pha 3 (35–45')  → Thư giãn, nhạc Lo-fi tự phát  │
   └────────────────────────────────────────────────────┘
           │
           ▼
[Khung Giờ Vàng — 3 phút (phút 45→48)]
  ─── Xác thực GPS hoặc OTP bypass từ nhân viên
           │
           ▼
[Hiển thị Mã Voucher Độc bản]
           │
           ▼
[Thu ngân POS nhập mã → Xác thực → Áp dụng giảm giá → Voucher vô hiệu hóa]
```

---

### 2.2 Máy Trạng thái 3 Pha

Đồng hồ Client được đồng bộ với Server theo công thức:
```
Δt = t_server_now − t_start_time
Offset = t_client_now − t_server_now
Δt thực tế = (t_client_now − Offset) − t_start_time
```

| Pha | Khoảng thời gian | State UI | Logic nghiệp vụ |
| :---: | :--- | :--- | :--- |
| **Pha 1** | `0 ≤ Δt < 15 phút` | `ONLINE_SUDOKU` | Mini-game Sudoku/Mật mã tương tác để neo sự chú ý của khách tại trang, ngăn thoát sang app khác. |
| **Pha 2** | `15 ≤ Δt < 35 phút` | `OFFLINE_QUEST` | Hiện Blind Box nhiệm vụ theo cấu hình quán (xem Phần III). Khách thực hiện nhiệm vụ vật lý, nhập kết quả vào ứng dụng. Đây là chốt xác thực hiện diện — **bắt buộc vượt qua trước khi nhận voucher**. |
| **Pha 3** | `35 ≤ Δt < 45 phút` | `MEDITATION` | Giao diện tối giản (dark mode). Nhạc Lo-fi/Ambient đã preload từ Pha 1 tự động phát. |
| **Claim Window** | `45 ≤ Δt ≤ 48 phút` | `GOLDEN_WINDOW` | Cửa sổ 3 phút để khách bấm `[NHẬN VOUCHER]`. Quá hạn → phiên chuyển `FAILED`. |

---

## PHẦN III — CONCEPT-DRIVEN BLIND BOX *(Tính năng v3.1)*

### 3.1 Triết lý Thiết kế Nhiệm vụ

Blind Box là thành phần quan trọng nhất của Pha 2. Nó không chỉ là "chốt xác thực hiện diện" — nó là **tâm điểm của trải nghiệm thương hiệu**.

**Nguyên tắc thiết kế:**

| Nguyên tắc | Mô tả |
| :--- | :--- |
| **Vật lý hóa** | Nhiệm vụ phải yêu cầu khách đứng dậy, di chuyển, hoặc chạm vào thứ gì đó trong quán. Không có nhiệm vụ nào có thể hoàn thành chỉ bằng ngồi nhìn màn hình. |
| **Theo mô hình quán** | Mỗi quán có một bộ nhiệm vụ phản ánh bản sắc riêng. Quán mèo ≠ quán sách ≠ quán acoustic. |
| **Mức độ xác thực phù hợp** | Không phải mọi nhiệm vụ đều cần đáp án đúng/sai tuyệt đối. Nhiệm vụ sáng tạo (vẽ, viết) chấp nhận "honor system" vì trải nghiệm quan trọng hơn kiểm soát. |
| **Tích lũy vết tích** | Kết quả nhiệm vụ (câu chép, bản vẽ, cảm nhận) được ghi vào **Sổ Nhật Ký Người Lạ** đặt tại bàn — tạo artifact sống động theo thời gian. |

**Tradeoff giữa Độ chặt chẽ và Độ gắn kết:**

```
Độ chặt chẽ (Fraud Resistance)
      ↑
      │  code_entry ●
      │
      │         numeric_range ●
      │
      │                  observation ●
      │
      │                         free_text ●
      │
      │                              physical_action ●
      └──────────────────────────────────────────────→
                                         Độ gắn kết (Engagement)
```

Quán lựa chọn điểm phù hợp trên trục này tùy thuộc vào triết lý thương hiệu của họ.

---

### 3.2 Bộ Loại Nhiệm vụ (Mission Type Catalog)

Hệ thống hỗ trợ 5 loại nhiệm vụ. Mỗi loại có cơ chế xác thực riêng:

#### Loại 1: `code_entry` — Nhập mã cố định
Khách tìm và nhập một mã/số cụ thể được đặt tại một vị trí vật lý trong quán.
- **Xác thực:** So sánh bcrypt hash phía Server. Không bao giờ trả về đáp án đúng về Client.
- **Ưu điểm:** Chặt chẽ nhất, dễ reset (thay vật thể/số).
- **Phù hợp với:** Mọi mô hình quán.

#### Loại 2: `numeric_range` — Đếm và nhập số
Khách đếm một thứ gì đó trong quán (tranh, cây, ghế...) và nhập số lượng.
- **Xác thực:** Số nhập vào phải nằm trong khoảng `[min_value, max_value]` cấu hình sẵn (cho phép sai số ±1–2).
- **Ưu điểm:** Tự nhiên hơn code_entry, không cần đặt vật thể mang mã.
- **Phù hợp với:** Quán có đồ vật đặc trưng dễ đếm.

#### Loại 3: `observation` — Quan sát và trả lời mở
Khách lắng nghe, nhìn, hoặc cảm nhận một điều gì đó rồi viết lại.
- **Xác thực:** Kiểm tra độ dài tối thiểu (`min_length`). Không có đáp án đúng/sai.
- **Ưu điểm:** Kết quả có thể lưu vào Sổ Nhật Ký, tạo UGC tự nhiên.
- **Phù hợp với:** Quán acoustic, quán có không gian nghệ thuật.

#### Loại 4: `free_text` — Sáng tạo tự do
Khách viết, vẽ, hoặc diễn đạt điều gì đó theo cảm nhận cá nhân.
- **Xác thực:** Kiểm tra độ dài tối thiểu. Nội dung không bị đánh giá đúng/sai.
- **Ưu điểm:** Tạo attachment cảm xúc cao nhất với thương hiệu.
- **Phù hợp với:** Quán nghệ thuật, quán sách, quán có concept sáng tạo.

#### Loại 5: `physical_action` — Hành động thực tế (Honor System)
Khách thực hiện một hành động thể chất (vuốt mèo, chụp ảnh, giải đố vật lý) rồi tự xác nhận hoàn thành.
- **Xác thực:** Khách bấm nút xác nhận. Không có kiểm tra kỹ thuật.
- **Ưu điểm:** Tạo kỷ niệm mạnh mẽ nhất, phá vỡ sự sượng sùng của khách ngồi một mình.
- **Phù hợp với:** Quán thú cưng, quán có đồ vật tương tác.
- **Rủi ro:** Có thể bị bỏ qua mà không thực sự thực hiện. Chấp nhận được vì giá trị voucher khiêm tốn.

---

### 3.3 Mẫu Nhiệm vụ theo Mô hình Quán

#### Mô hình A — Quán Cafe Thú Cưng (Cat Cafe / Dog Cafe)

```json
{
  "rotation_mode": "weekday",
  "quests": [
    {
      "id": "cat_find_miu",
      "type": "physical_action",
      "active_weekdays": [1, 2, 3, 4, 5],
      "content": {
        "title": "🐱 Nhiệm vụ: Tìm chú Miu",
        "description": "Tìm chú mèo tên [MIU] của quán đang nằm đâu đó. Vuốt ve nó và chụp một bức ảnh bằng camera thường (không được mở mạng xã hội!), hoặc vẽ lại dáng nằm của Miu vào cuốn sổ Nhật Ký trên bàn bạn.",
        "hint": "Miu thường hay nằm gần cửa sổ hoặc trên kệ sách nhé!",
        "confirm_button": "✅ Tôi đã tìm được Miu và hoàn thành nhiệm vụ!"
      }
    },
    {
      "id": "cat_count_weekend",
      "type": "numeric_range",
      "active_weekdays": [6, 0],
      "content": {
        "title": "🐾 Nhiệm vụ: Kiểm kê Cư dân",
        "description": "Đi một vòng quán, đếm xem hôm nay có bao nhiêu chú mèo/chó đang hiện diện trong quán. Nhập số lượng vào ô bên dưới.",
        "hint": "Đếm cả những bạn đang ngủ nhé!",
        "placeholder": "Nhập số lượng...",
        "min_value": 1,
        "max_value": 20
      }
    }
  ]
}
```

**Hiệu ứng kỳ vọng:** Khách ngồi một mình sẽ đứng dậy, đi tìm mèo, tương tác tự nhiên — xóa tan sự sượng sùng và tạo ra không khí dễ chịu. Khoảnh khắc này có xu hướng lan rộng tự nhiên trên mạng xã hội khi khách chia sẻ ảnh chụp.

---

#### Mô hình B — Quán Cafe Boardgame / Sách

```json
{
  "rotation_mode": "weekday",
  "quests": [
    {
      "id": "book_sentence",
      "type": "free_text",
      "active_weekdays": [1, 3, 5],
      "content": {
        "title": "📖 Nhiệm vụ: Câu văn của Người lạ",
        "description": "Đến kệ sách của quán, rút một cuốn bất kỳ ở ngăn thứ 2 từ trên xuống, mở trang số 45. Chép lại câu văn đầu tiên của trang đó vào cuốn sổ Nhật Ký Người Lạ trên bàn bạn. Câu chép của bạn sẽ nằm ngay bên cạnh câu của người ngồi đây trước bạn.",
        "hint": "Kệ sách ở góc bên trái quán nhé!",
        "placeholder": "Nhập câu văn bạn đã chép...",
        "min_length": 15
      }
    },
    {
      "id": "puzzle_solve",
      "type": "code_entry",
      "active_weekdays": [2, 4, 6, 0],
      "content": {
        "title": "🧩 Nhiệm vụ: Gỡ rối",
        "description": "Trên bàn bạn có một ô đựng dây thừng nhỏ. Gỡ rối sợi dây đó ra và tìm mảnh giấy ẩn bên trong. Nhập số bí mật trên mảnh giấy vào đây.",
        "answer_hash": "bcrypt_hash_here",
        "hint": "Kiên nhẫn một chút, không cần dùng sức!"
      }
    }
  ]
}
```

**Hiệu ứng kỳ vọng:** Cuốn sổ Nhật Ký tích lũy hàng trăm câu chép từ các vị khách khác nhau — trở thành artifact sống của quán, một tác phẩm cộng đồng không ai lên kế hoạch. Chủ quán có thể chụp và đăng lên mạng xã hội định kỳ.

---

#### Mô hình C — Quán Cafe Cây Xanh / Acoustic Chill

```json
{
  "rotation_mode": "weekday",
  "quests": [
    {
      "id": "music_listen",
      "type": "observation",
      "active_weekdays": [1, 2, 3, 4, 5],
      "content": {
        "title": "🎵 Nhiệm vụ: Lắng nghe",
        "description": "Nhắm mắt lại trong 3 phút (bạn có thể đặt timer). Tập trung lắng nghe bài nhạc đang phát trong quán. Sau đó, viết vào ô bên dưới: tên bài hát nếu bạn đoán được — hoặc chỉ cần viết cảm xúc của bạn lúc này. Không có câu trả lời đúng hay sai.",
        "hint": "Đừng cố đoán bằng mọi giá — cảm nhận thôi cũng đủ rồi.",
        "placeholder": "Tên bài hát, hoặc cảm xúc của bạn...",
        "min_length": 5
      }
    },
    {
      "id": "plant_count",
      "type": "numeric_range",
      "active_weekdays": [6, 0],
      "content": {
        "title": "🌿 Nhiệm vụ: Điểm danh Cây xanh",
        "description": "Đứng dậy và đi một vòng quán. Đếm tổng số chậu cây xanh đang có mặt trong không gian trong nhà (không tính khu ngoài trời nếu có).",
        "hint": "Đừng quên cả cây treo trên tường nhé!",
        "placeholder": "Nhập số chậu cây...",
        "min_value": 3,
        "max_value": 50
      }
    }
  ]
}
```

---

### 3.4 Sổ Nhật Ký Người Lạ

**Sổ Nhật Ký Người Lạ** (Stranger's Journal) là điểm kết nối vật lý-kỹ thuật số quan trọng nhất của hệ thống Blind Box. Đây không chỉ là một prop — nó là một **sản phẩm sống**.

**Vòng đời của một cuốn Sổ:**

```
[Quán đặt sổ trắng tại bàn, trang đầu in hướng dẫn ngắn]
           │
           ▼
[Khách 1: Chép câu văn trang 45 → ghi ngày, ký tên viết tắt]
[Khách 2: Vẽ dáng mèo Miu → ghi ngày]
[Khách 3: Viết cảm nhận về bài nhạc → ghi ngày]
    ...  [tiếp tục trong nhiều tuần]
           │
           ▼
[Sổ đầy → Chủ quán chụp ảnh các trang đẹp nhất]
           │
           ▼
[Đăng lên Instagram/TikTok với caption: "45 phút không mạng, những điều này được sinh ra"]
           │
           ▼
[User-generated content → Viral tự nhiên]
           │
           ▼
[Sổ cũ được trưng bày/lưu trữ → Sổ mới bắt đầu vòng đời mới]
```

**Sổ như nguồn doanh thu bổ sung:**

Off-Phone Rewards có thể cung cấp sổ in sẵn theo theme của từng gói quán (bìa có logo Off-Phone + logo quán, các trang có prompt gợi ý). Bán cho venue như consumable merchandise — vừa là vật phẩm trải nghiệm, vừa là kênh marketing vật lý.

---

## PHẦN IV — KIẾN TRÚC KỸ THUẬT

### 4.1 Mô hình Dữ liệu

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BẢNG 1: VENUES — Thông tin điểm kinh doanh
-- ============================================================
CREATE TABLE venues (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              VARCHAR(255) NOT NULL,
    latitude          DOUBLE PRECISION NOT NULL,
    longitude         DOUBLE PRECISION NOT NULL,
    radius_meters     SMALLINT NOT NULL DEFAULT 20,
    -- Cấu hình Blind Box, xem chi tiết cấu trúc JSON ở Phần III
    sub_quest_config  JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Cấu hình giao diện theo brand của quán
    branding          JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- API key cho tích hợp POS (mã hóa trước khi lưu)
    pos_api_key_hash  VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BẢNG 2: FOCUS_SESSIONS — Phiên tập trung của khách
-- ============================================================
CREATE TYPE session_status AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED');

CREATE TABLE focus_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id            UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    guest_token         TEXT NOT NULL,
    device_fingerprint  VARCHAR(64),
    start_time          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    status              session_status NOT NULL DEFAULT 'RUNNING',
    sub_quest_passed    BOOLEAN NOT NULL DEFAULT FALSE,
    -- Lưu nội dung khách nhập (free_text / observation) để tham khảo phân tích
    sub_quest_response  TEXT,
    infraction_count    SMALLINT NOT NULL DEFAULT 0,
    ip_address          INET NOT NULL,
    user_agent          TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_resume
    ON focus_sessions(guest_token, venue_id)
    WHERE status = 'RUNNING';

-- ============================================================
-- BẢNG 3: VOUCHERS — Kho mã giảm giá
-- ============================================================
CREATE TYPE voucher_status AS ENUM ('AVAILABLE', 'RESERVED', 'REDEEMED');

CREATE TABLE vouchers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
    code        VARCHAR(50) NOT NULL UNIQUE,
    status      voucher_status NOT NULL DEFAULT 'AVAILABLE',
    assigned_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vouchers_pos ON vouchers(code, venue_id);

-- ============================================================
-- BẢNG 4: BYPASS_OTPS — Mã OTP xác thực thủ công
-- ============================================================
CREATE TABLE bypass_otps (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    session_id      UUID NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
    otp_code        VARCHAR(6) NOT NULL,
    created_by_ip   INET NOT NULL,
    used_at         TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bypass_otp_lookup
    ON bypass_otps(otp_code, session_id)
    WHERE used_at IS NULL;

-- ============================================================
-- BẢNG 5: DEVICE_DAILY_LIMITS — Giới hạn theo thiết bị / ngày
-- ============================================================
CREATE TABLE device_daily_limits (
    fingerprint         VARCHAR(64) NOT NULL,
    venue_id            UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    date                DATE NOT NULL DEFAULT CURRENT_DATE,
    successful_claims   SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (fingerprint, venue_id, date)
);

-- ============================================================
-- BẢNG 6: VENUE_ADMIN_USERS — Tài khoản quản trị quán (Admin UI)
-- ============================================================
CREATE TABLE venue_admin_users (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL UNIQUE,
    -- Mật khẩu hash (bcrypt), quản lý qua Supabase Auth
    supabase_uid UUID NOT NULL UNIQUE,
    role         VARCHAR(20) NOT NULL DEFAULT 'owner', -- owner | staff
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Cấu trúc `branding` JSONB:**
```json
{
  "theme_id": "cat_cafe",
  "challenge_title": "Thử thách Vương quốc Mèo",
  "primary_color": "#FF9F7B",
  "accent_color": "#FFE0D6",
  "mascot_emoji": "🐱",
  "phase2_label": "Nhiệm vụ đặc biệt từ Miu",
  "phase3_label": "Thư giãn cùng Miu",
  "background_style": "paw_prints"
}
```

---

### 4.2 Đặc tả Server Actions

#### Module 1 — `createOrResumeSession`

**Luồng:** Client kiểm tra `localStorage`, tạo `guest_token` nếu chưa có, thu thập `deviceFingerprint` (SHA-256 của các tín hiệu thiết bị), gửi lên Server.

Server kiểm tra:
1. Phiên `RUNNING` tồn tại? → Trả về `serverNow + startTime` để Client tái dựng đồng hồ (**Resume Flow**).
2. Không có phiên cũ → Kiểm tra rate-limit 3 lớp → Tạo phiên mới.

**Rate-limit 3 lớp:**

| Lớp | Key | Hành vi khi vượt |
| :--- | :--- | :--- |
| IP | `ratelimit:{venueId}:{ip}` | Từ chối tuyệt đối |
| Device fingerprint | `device_daily_limits` | Thông báo thân thiện: *"Hôm nay bạn đã nhận thưởng rồi!"* |
| Guest token | `focus_sessions` table | Tương tự fingerprint |

---

#### Module 2 — `validateSubQuest` *(cập nhật v3.1)*

Xử lý đủ 5 loại nhiệm vụ:

```typescript
export async function validateSubQuest(payload: {
  sessionId: string;
  venueId: string;
  answer?: string;       // code_entry, numeric_range, free_text, observation
  confirmed?: boolean;   // physical_action
}): Promise<{ valid: boolean }> {

  const venue = await db.query(
    "SELECT sub_quest_config FROM venues WHERE id = $1", [payload.venueId]
  );

  const config = venue.rows[0].sub_quest_config;
  const today  = new Date().getDay();
  const quest  = config.quests.find((q: Quest) => q.active_weekdays.includes(today));
  if (!quest) throw new Error("Chưa cấu hình nhiệm vụ cho hôm nay.");

  let isValid = false;

  switch (quest.type) {
    case 'code_entry':
      isValid = await bcrypt.compare(
        payload.answer!.trim().toLowerCase(),
        quest.content.answer_hash
      );
      break;

    case 'numeric_range':
      const num = parseInt(payload.answer ?? '');
      isValid = !isNaN(num)
             && num >= quest.content.min_value
             && num <= quest.content.max_value;
      break;

    case 'observation':
    case 'free_text':
      isValid = (payload.answer?.trim().length ?? 0) >= quest.content.min_length;
      break;

    case 'physical_action':
      // Honor system — không kiểm tra kỹ thuật
      isValid = payload.confirmed === true;
      break;
  }

  if (isValid) {
    await db.query(
      `UPDATE focus_sessions
       SET sub_quest_passed   = TRUE,
           sub_quest_response = $2
       WHERE id = $1`,
      [payload.sessionId, payload.answer ?? '[physical action confirmed]']
    );
  }

  return { valid: isValid };
}
```

---

#### Module 3 — `generateBypassOTP`

OTP 6 số do Server sinh, TTL 5 phút, single-use, gắn với session_id cụ thể. Thay thế hoàn toàn cơ chế Static PIN dễ bị lộ.

```typescript
export async function generateBypassOTP(payload: {
  venueId: string;
  sessionId: string;
}): Promise<{ otp: string; expiresAt: Date }> {

  const session = await db.query(
    `SELECT id FROM focus_sessions
     WHERE id = $1 AND venue_id = $2 AND status = 'RUNNING'`,
    [payload.sessionId, payload.venueId]
  );
  if (session.rows.length === 0) throw new Error("Session không hợp lệ.");

  // Hủy OTP cũ chưa dùng
  await db.query(
    "UPDATE bypass_otps SET expires_at = NOW() WHERE session_id = $1 AND used_at IS NULL",
    [payload.sessionId]
  );

  const otpCode  = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.query(
    `INSERT INTO bypass_otps (venue_id, session_id, otp_code, created_by_ip, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [payload.venueId, payload.sessionId, otpCode, getClientIP(), expiresAt]
  );

  return { otp: otpCode, expiresAt };
}
```

---

#### Module 4 — `claimVoucher`

Xử lý đồng thời: race condition (FOR UPDATE SKIP LOCKED), replay attack (idempotency check), time manipulation (server-side timestamp validation).

```typescript
export async function claimVoucher(payload: {
  sessionId: string;
  venueId: string;
  lat?: number;
  lng?: number;
  bypassOtp?: string;
}) {
  // Bước 1: Kiểm tra thời gian (phút 45–48)
  const session = await db.query(
    "SELECT start_time, status, sub_quest_passed FROM focus_sessions WHERE id = $1",
    [payload.sessionId]
  );
  if (session.rows[0].status !== 'RUNNING')
    throw new Error("Phiên không còn hoạt động.");
  if (!session.rows[0].sub_quest_passed)
    throw new Error("Chưa hoàn thành nhiệm vụ Blind Box.");

  const elapsedMinutes = (Date.now() - session.rows[0].start_time) / 60000;
  if (elapsedMinutes < 45 || elapsedMinutes > 48) {
    await db.query("UPDATE focus_sessions SET status = 'FAILED' WHERE id = $1", [payload.sessionId]);
    throw new Error("Ngoài Khung Giờ Vàng.");
  }

  // Bước 2: Xác thực hiện diện (GPS hoặc OTP bypass)
  if (payload.bypassOtp) {
    const otp = await db.query(
      `SELECT id FROM bypass_otps
       WHERE otp_code = $1 AND session_id = $2
       AND used_at IS NULL AND expires_at > NOW()`,
      [payload.bypassOtp, payload.sessionId]
    );
    if (otp.rows.length === 0) throw new Error("Mã OTP không hợp lệ hoặc đã hết hạn.");
    await db.query("UPDATE bypass_otps SET used_at = NOW() WHERE id = $1", [otp.rows[0].id]);
  } else if (payload.lat && payload.lng) {
    const venue = await db.query(
      "SELECT latitude, longitude, radius_meters FROM venues WHERE id = $1", [payload.venueId]
    );
    const distance = calculateHaversine(
      payload.lat, payload.lng,
      venue.rows[0].latitude, venue.rows[0].longitude
    );
    if (distance > venue.rows[0].radius_meters)
      throw new Error("Xác thực địa lý thất bại.");
  } else {
    throw new Error("Cần cung cấp tọa độ GPS hoặc mã OTP bypass.");
  }

  // Bước 3: Idempotency — tránh cấp trùng
  const existing = await db.query(
    "SELECT code FROM vouchers WHERE session_id = $1 LIMIT 1", [payload.sessionId]
  );
  if (existing.rows.length > 0) return { code: existing.rows[0].code };

  // Bước 4: Giao dịch nguyên tử
  try {
    await db.query("BEGIN");
    const voucher = await db.query(`
      UPDATE vouchers
      SET session_id  = $1,
          status      = 'RESERVED',
          assigned_at = NOW(),
          expires_at  = NOW() + INTERVAL '3 days'
      WHERE id = (
          SELECT id FROM vouchers
          WHERE venue_id = $2 AND status = 'AVAILABLE'
          LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      RETURNING code;
    `, [payload.sessionId, payload.venueId]);

    if (voucher.rows.length === 0)
      throw new Error("Kho voucher đã hết. Vui lòng liên hệ nhân viên quán.");

    await db.query(
      "UPDATE focus_sessions SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1",
      [payload.sessionId]
    );
    await db.query("COMMIT");
    return { code: voucher.rows[0].code };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
```

---

#### Module 5 — Xác thực tại quầy POS

**Giao diện Web (hiện tại):** Thu ngân truy cập `/venue/[id]/pos` → nhập mã từ màn hình khách.

**REST API (cho tích hợp POS — Gói Chain):**

```
POST /api/v1/vouchers/redeem
Authorization: Bearer {pos_api_key}

Body: { "code": "ABCD-1234", "venue_id": "uuid" }
Response: { "success": true, "discount_percent": 10 }
```

SQL xử lý (chung cho cả hai phương thức):
```sql
UPDATE vouchers
SET    status = 'REDEEMED', redeemed_at = NOW()
WHERE  code = :input_code
  AND  venue_id = :venue_id
  AND  status = 'RESERVED'
  AND  expires_at > NOW()
RETURNING id;
```

`Affected rows = 1` → Thành công (xanh). `= 0` → Không hợp lệ / đã dùng / hết hạn (đỏ).

---

### 4.3 Bảo mật Multi-tenant (Row-Level Security)

Khi Admin UI được triển khai, bắt buộc phải có RLS để ngăn admin của quán A truy cập dữ liệu quán B.

```sql
-- Kích hoạt RLS trên các bảng nhạy cảm
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bypass_otps     ENABLE ROW LEVEL SECURITY;

-- Policy: Admin chỉ đọc/ghi dữ liệu của venue mình
CREATE POLICY venue_isolation ON focus_sessions
  USING (
    venue_id IN (
      SELECT venue_id FROM venue_admin_users
      WHERE supabase_uid = auth.uid()
    )
  );

-- Áp dụng tương tự cho vouchers và bypass_otps
CREATE POLICY venue_isolation ON vouchers
  USING (
    venue_id IN (
      SELECT venue_id FROM venue_admin_users
      WHERE supabase_uid = auth.uid()
    )
  );

-- Service role (Server Actions) bypass RLS hoàn toàn
-- Client-facing queries dùng anon/authenticated role với RLS bật
```

---

## PHẦN V — VẬN HÀNH & AN TOÀN

### 5.1 Xử lý Ngoại lệ & Phương án Dự phòng

#### iOS Vibration API
`window.navigator.vibrate` bị chặn hoàn toàn trên iPhone/iPad. Fallback: hiệu ứng chớp màn hình + âm thanh chuông tần số cao mã hóa sẵn dưới dạng Base64, không cần request mạng.

#### Autoplay Policy
Trình duyệt chặn `.play()` nếu chưa có User Gesture. Giải pháp: tại khoảnh khắc khách bấm `[START CHALLENGE]`, khởi tạo `AudioContext` ở trạng thái muted và preload file nhạc. Khi đồng hồ chuyển Pha 3, chỉ cần unmute + play — không bị chặn vì context đã unlock.

#### Lỗi GPS
Fallback: OTP bypass do nhân viên cấp. TTL 5 phút, single-use, audit trail đầy đủ (xem Module 3).

#### Kho Voucher Cạn
Không hiển thị lỗi kỹ thuật. Thay vào đó: thông báo thân thiện + hệ thống gửi cảnh báo tự động cho admin quán khi kho còn dưới 20 mã.

---

### 5.2 Quản trị Rủi ro & Gian lận

| Hình thức gian lận | Biện pháp phòng chống | Mức rủi ro còn lại |
| :--- | :--- | :--- |
| **Giả lập GPS** | Haversine chạy trên Server. Sub-quest Blind Box yêu cầu tương tác vật lý. | **Chấp nhận được** — người dùng phổ thông không làm được |
| **Bypass bằng Incognito** | Device fingerprint (SHA-256) + `device_daily_limits` | **Thấp** — fingerprint nhất quán qua ẩn danh |
| **Spam tạo phiên** | Rate-limit 3 lớp. Cron Job dọn phiên `EXPIRED` hàng giờ | **Rất thấp** — phiên rác không cấp được voucher |
| **OTP bị lộ** | Server-generated, TTL 5 phút, single-use, gắn session_id | **Rất thấp** |
| **Share đáp án Sub-quest** | Câu đố rotate theo ngày trong tuần, trỏ đến đồ vật khác nhau | **Trung bình — chấp nhận** — đáp án mất hiệu lực sau 1–2 ngày |
| **Honor system bị bỏ qua** (physical_action) | Không có biện pháp kỹ thuật. Giá trị voucher khiêm tốn được tính vào Retention Cost | **Rủi ro được chấp nhận từ thiết kế** |
| **Data breach — admin xem dữ liệu quán khác** | Row-Level Security (Mục 4.3) | **Rất thấp** sau khi triển khai RLS |

---

## PHẦN VI — KINH DOANH

### 6.1 Mô hình Doanh thu & Định giá

#### Luồng doanh thu

```
Luồng 1 — SaaS Subscription (chính)
  └── Venue trả phí tháng theo gói

Luồng 2 — Physical Merchandise (mới, v3.1)
  └── Off-Phone bán Sổ Nhật Ký Người Lạ in thương hiệu cho venue
      (consumable, cần bổ sung định kỳ)

Luồng 3 — Data Insights (tương lai)
  └── Aggregate behavioral data → bán market insight cho F&B brand lớn
      (cần làm rõ về pháp lý trước khi triển khai)
```

#### Bảng Định giá

| Gói | Giá / tháng | Phù hợp | Giới hạn | Tính năng |
| :--- | :---: | :--- | :--- | :--- |
| **Starter** | Miễn phí | Thử nghiệm | 1 venue, 80 sessions/tháng | Đủ để validate concept |
| **Solo** | 299.000 đ | Quán indie ≤ 40 ghế | 1 venue, 500 sessions/tháng | Analytics cơ bản, custom Blind Box |
| **Growth** | 799.000 đ | Quán vừa, chuỗi 2–5 điểm | 5 venues, unlimited sessions | Multi-venue dashboard, alert kho cạn, export data |
| **Chain** | 2.490.000 đ | Chuỗi F&B > 5 điểm | Unlimited | White-label, POS API, SLA, Sổ branded miễn phí |

#### Unit Economics — Tháng 12 (Kịch bản thận trọng)

```
Phân bổ (50 venues):
  ├── 20 venues Starter      →        0 đ
  ├── 20 venues Solo         →  5.980.000 đ
  ├──  8 venues Growth       →  6.392.000 đ
  └──  2 venues Chain        →  4.980.000 đ

MRR:                            17.352.000 đ (~$690 USD)

Chi phí vận hành:
  ├── Supabase Pro           →  2.000.000 đ
  ├── Vercel Pro             →    500.000 đ
  └── Domain + misc          →    500.000 đ
  Tổng:                          3.000.000 đ

Lợi nhuận gộp tháng 12:        14.352.000 đ
```

Con số đủ để **self-sustain** trong giai đoạn bootstrap, trước khi tìm đầu tư hoặc mở rộng.

---

### 6.2 Chiến lược Go-to-Market

#### Giai đoạn 0 — Pilot có kiểm soát (Tháng 1–2)

**Mục tiêu validate 3 giả thuyết:**
1. Tỷ lệ hoàn thành thử thách ≥ 30% trong số người bắt đầu
2. Tỷ lệ đổi voucher ≥ 60% trong số người hoàn thành
3. Chủ quán nhận thấy cải thiện doanh thu hoặc order per table có ý nghĩa

**Hành động:**
- Chọn 2–3 quán "anchor" theo 3 mô hình khác nhau (thú cưng + sách/boardgame + acoustic) để test Blind Box đa dạng
- Cung cấp hoàn toàn miễn phí + thiết kế standee + hỗ trợ onboarding trực tiếp + tặng 1 cuốn Sổ Nhật Ký in sẵn
- Kết quả pilot → case study cụ thể theo từng mô hình quán để bán cho venue tiếp theo

#### Giai đoạn 1 — Mở rộng hữu cơ (Tháng 3–6)

| Kênh | Hành động |
| :--- | :--- |
| Facebook Groups F&B | Post case study + video demo 60 giây, nhấn mạnh tính khác biệt theo mô hình quán |
| TikTok / Instagram | Khuyến khích khách quay "unboxing" Blind Box → UGC tự nhiên |
| Đối tác nhà phân phối F&B | Bundle với nhà phân phối cà phê, thiết bị pha chế |

**Điều kiện tiên quyết trước khi sang Giai đoạn 1:**

- [ ] **Admin UI tự phục vụ tối thiểu:** Chủ quán tự cấu hình Blind Box, nạp voucher, xem dashboard mà không cần kỹ sư
- [ ] **Quy trình onboarding < 30 phút:** Video hướng dẫn + checklist in sẵn
- [ ] **SLA rõ ràng:** Cam kết uptime và thời gian phản hồi (F&B vận hành 7 ngày)
- [ ] **RLS triển khai:** Bảo mật dữ liệu multi-tenant trước khi onboard venue trả phí

#### Giai đoạn 2 — Scale (Tháng 7–12)
- Tiếp cận chuỗi F&B (Gói Chain + POS API)
- Tích hợp với hệ thống POS phổ biến (KiotViet, Sapo)
- Mở rộng Merchandise: bán Sổ Nhật Ký branded theo gói subscription

---

## PHẦN VII — TRIỂN KHAI

### 7.1 Phạm vi MVP

**Loại khỏi MVP:**
- Admin UI hoàn chỉnh (thao tác qua Supabase Dashboard bởi kỹ sư)
- POS REST API (venue dùng giao diện web POS)
- Data Insights / Analytics nâng cao
- Đa ngôn ngữ (mặc định `vi-VN`, fallback `en-US`)

**Bắt buộc có trong MVP:**

| Tính năng | Lý do bắt buộc |
| :--- | :--- |
| Luồng đầy đủ QR → Challenge → Voucher | Core flow |
| Máy trạng thái 3 pha + Claim Window | Core flow |
| Blind Box — tối thiểu loại `code_entry` + `physical_action` | Nếu không có Blind Box, sản phẩm chỉ là app đếm giờ |
| GPS + OTP Bypass | Bắt buộc cho vận hành thực tế |
| Giao diện POS web cho thu ngân | Bắt buộc để hoàn tất chu trình |
| Device fingerprint + Rate-limit 3 lớp | Nếu thiếu, kho voucher bị vét ngay ngày đầu |
| Branding config (màu sắc + tên challenge) | Tối thiểu để venue cảm thấy sản phẩm là của họ |
| Cron Job dọn phiên `EXPIRED` + alert kho cạn | Hygiene bắt buộc |

---

### 7.2 Câu hỏi Mở cần Làm rõ

Cần Product Owner và chủ doanh nghiệp làm rõ trước khi bắt đầu sprint đầu tiên:

**1. Thời hạn hiệu lực Voucher**
Áp dụng ngay trong lần ghé thăm (vài tiếng) hay tích lũy 3 ngày như spec hiện tại? Ảnh hưởng đến hành vi quay lại.

**2. Cơ chế Sudoku ở Pha 1**
Sinh ngẫu nhiên (phức tạp hơn) hay tập cố định 10–20 câu đố xoay vòng (đủ cho MVP)?

**3. Ai sở hữu dữ liệu hành vi người dùng?**
Dữ liệu behavioral (tỷ lệ hoàn thành, giờ cao điểm, hiệu quả từng loại Blind Box) thuộc về từng venue hay Off-Phone Rewards có quyền aggregate để monetize? Quyết định sớm để tránh tranh chấp pháp lý sau này.

**4. Nội dung Sổ Nhật Ký có được kiểm duyệt không?**
Khi khách viết `free_text` vào sổ vật lý và ứng dụng lưu nội dung đó, cần chính sách rõ ràng: ai kiểm duyệt, xử lý thế nào khi có nội dung không phù hợp.

**5. Tuân thủ pháp lý — Nghị định 13/2023/NĐ-CP**
Hệ thống thu thập IP, device fingerprint, tọa độ GPS. Cần tham vấn luật sư về chính sách thu thập dữ liệu và cơ chế xin đồng ý (consent) trước khi launch công khai.

**6. Cơ chế nạp lại kho Voucher**
Chủ quán tự nạp qua Admin UI hay gửi file cho kỹ sư? Và khi nào thì nhận được cảnh báo? Cần định nghĩa rõ ngưỡng cảnh báo và kênh thông báo (email / Zalo OA).

---

*Tài liệu PRD v3.1 — Off-Phone Rewards*
*Tổng hợp từ V2.0 + V2.1 + V3.0, bổ sung: Concept-Driven Blind Box, Scale Architecture, RLS, POS API spec*
*Toàn bộ code trong tài liệu là pseudo-code / specification — cần review thêm khi triển khai thực tế.*
