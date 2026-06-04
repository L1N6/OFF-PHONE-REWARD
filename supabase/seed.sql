-- =====================================================================
-- Off-Phone Rewards — seed.sql (pilot 🟢)
-- Chạy SAU schema.sql. Idempotent (ON CONFLICT DO NOTHING).
--
-- VENUE_ID cố định để gán thẳng vào env VENUE_ID (không phải copy UUID random):
--   VENUE_ID=11111111-1111-1111-1111-111111111111
--
-- Blind Box code_entry: đáp án seed = "1234" (khớp khoá số 4 chữ số trên hộp).
--   Hash bằng bcrypt qua pgcrypto crypt()/gen_salt('bf',10) → tương thích
--   node bcrypt.compare ($2a$). T2-7 validate: bcrypt.compare(answer.trim().toLowerCase(), answer_hash).
--   ⚠️ Đổi "1234" thành mã thật của quán trước khi pilot (re-seed hoặc UPDATE).
-- =====================================================================

-- crypt()/gen_salt() nằm ở schema `public` (local) hoặc `extensions` (Supabase) → để cả hai resolve được.
SET search_path TO public, extensions;

-- ---- 1 venue pilot ----
INSERT INTO venues (id, name, latitude, longitude, radius_meters, timezone, branding, sub_quest_config, active)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Off-Phone Pilot Café',
    10.776530,   -- ⚠️ TODO: thay bằng VĨ ĐỘ thật của quán pilot
    106.700981,  -- ⚠️ TODO: thay bằng KINH ĐỘ thật của quán pilot
    20,
    'Asia/Ho_Chi_Minh',
    jsonb_build_object(
        'primary_color',  '#0F766E',
        'accent_color',   '#F59E0B',
        'challenge_name', 'Gác Máy 45 Phút'
    ),
    jsonb_build_object(
        'rotation_mode', 'weekday',
        'quests', jsonb_build_array(
            jsonb_build_object(
                'id', 'box_code',
                'type', 'code_entry',
                'active_weekdays', jsonb_build_array(1,2,3,4,5,6,0),  -- DOW: 0=CN..6=T7 → tất cả các ngày
                'content', jsonb_build_object(
                    'title', '🔓 Mở Blind Box',
                    'description', 'Nhập mã 4 chữ số trên mảnh giấy trong hộp.',
                    'answer_hash', crypt('1234', gen_salt('bf', 10)),
                    'hint', 'Mã 4 chữ số.'
                )
            ),
            jsonb_build_object(
                'id', 'stretch',
                'type', 'physical_action',
                'active_weekdays', jsonb_build_array(1,2,3,4,5,6,0),
                'content', jsonb_build_object(
                    'title', '🤸 Đứng dậy vươn vai',
                    'description', 'Đứng dậy, vươn vai 3 cái rồi xác nhận.',
                    'confirm_button', '✅ Đã xong'
                )
            )
        )
    ),
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ---- 20 voucher AVAILABLE, code deterministic OPR-XXXX-XXXX ----
INSERT INTO vouchers (venue_id, code, status)
SELECT
    '11111111-1111-1111-1111-111111111111',
    'OPR-' || upper(substr(md5('opr-seed-' || g::text), 1, 4))
           || '-' || upper(substr(md5('opr-seed-' || g::text), 5, 4)),
    'AVAILABLE'
FROM generate_series(1, 20) AS g
ON CONFLICT (venue_id, code) DO NOTHING;

-- Liệt kê voucher đã seed (tham khảo khi test POS):
--   SELECT code FROM vouchers WHERE venue_id='11111111-1111-1111-1111-111111111111' ORDER BY code;
