-- =====================================================================
-- get_active_quests_test.sql — test SQL function (specs §3)
-- Yêu cầu: schema.sql + seed.sql đã apply (venue seed 11111111… có 2 quest
--   code_entry + physical_action, active mọi ngày).
-- Chạy: docker exec -i opr-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--         -f /tmp/get_active_quests_test.sql
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

-- T1: venue seed → ≥2 quest active hôm nay, KHÔNG lộ answer_hash, có cả 2 loại
DO $$
DECLARE r JSONB; n INT;
BEGIN
    r := get_active_quests('11111111-1111-1111-1111-111111111111');
    n := jsonb_array_length(r);
    IF n < 2 THEN RAISE EXCEPTION 'T1 FAIL: mong >=2 quest, got %', n; END IF;
    IF r::text LIKE '%answer_hash%' THEN RAISE EXCEPTION 'T1 FAIL: LỘ answer_hash'; END IF;
    IF NOT (r @> '[{"type":"code_entry"}]'::jsonb) THEN RAISE EXCEPTION 'T1 FAIL: thiếu code_entry'; END IF;
    IF NOT (r @> '[{"type":"physical_action"}]'::jsonb) THEN RAISE EXCEPTION 'T1 FAIL: thiếu physical_action'; END IF;
    RAISE NOTICE 'T1 PASS — % quest, không lộ answer_hash, đủ 2 loại', n;
END $$;

-- T2: venue không tồn tại → []
DO $$
DECLARE r JSONB;
BEGIN
    r := get_active_quests('00000000-0000-4000-8000-000000000000');
    IF r <> '[]'::jsonb THEN RAISE EXCEPTION 'T2 FAIL: mong [], got %', r; END IF;
    RAISE NOTICE 'T2 PASS — venue not-found → []';
END $$;

-- T3: quest active NGÀY KHÁC → bị loại (weekday filter)
DO $$
DECLARE r JSONB; vid UUID := '44444444-4444-4444-4444-444444444444'; other_dow INT;
BEGIN
    other_dow := (EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::INT + 1) % 7;
    INSERT INTO venues (id, name, latitude, longitude, sub_quest_config)
    VALUES (vid, 'TEST other-day', 10, 106,
            jsonb_build_object('quests', jsonb_build_array(jsonb_build_object(
                'id', 'x', 'type', 'code_entry',
                'active_weekdays', jsonb_build_array(other_dow),
                'content', jsonb_build_object('title', 't', 'answer_hash', 'h')))))
    ON CONFLICT (id) DO NOTHING;
    r := get_active_quests(vid);
    IF jsonb_array_length(r) <> 0 THEN RAISE EXCEPTION 'T3 FAIL: quest ngày khác KHÔNG bị loại'; END IF;
    RAISE NOTICE 'T3 PASS — quest active ngày khác → loại khỏi hôm nay';
END $$;

ROLLBACK;
\echo '✅ ALL get_active_quests TESTS PASSED'
