-- =====================================================================
-- validate_sub_quest_test.sql — test SQL function (specs §3)
-- Yêu cầu: schema.sql + seed.sql đã apply (venue seed 11111111… có
--   code_entry answer="1234" + physical_action, active mọi ngày).
-- Chạy (Docker postgres 16):
--   docker exec -i opr-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/tests/validate_sub_quest_test.sql
-- Bọc BEGIN/ROLLBACK. ASSERT bằng RAISE EXCEPTION.
-- =====================================================================
\set ON_ERROR_STOP on
\set VID '''11111111-1111-1111-1111-111111111111'''
BEGIN;

-- T1: physical_action confirmed → valid + cờ set
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tk-phys') RETURNING id INTO sid;
    SELECT * INTO r FROM validate_sub_quest(sid, '11111111-1111-1111-1111-111111111111', NULL, TRUE);
    IF NOT r.out_valid THEN RAISE EXCEPTION 'T1 FAIL physical: %', r.out_error; END IF;
    IF (SELECT sub_quest_passed FROM focus_sessions WHERE id = sid) IS NOT TRUE THEN
        RAISE EXCEPTION 'T1 FAIL cờ chưa set'; END IF;
    RAISE NOTICE 'T1 PASS physical_action confirmed';
END $$;

-- T2: code_entry đúng "1234" → valid
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tk-code-ok') RETURNING id INTO sid;
    SELECT * INTO r FROM validate_sub_quest(sid, '11111111-1111-1111-1111-111111111111', '1234', FALSE);
    IF NOT r.out_valid THEN RAISE EXCEPTION 'T2 FAIL code đúng: %', r.out_error; END IF;
    RAISE NOTICE 'T2 PASS code_entry đúng';
END $$;

-- T3: code_entry chuẩn hoá "  1234 " (trim) → valid
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tk-code-norm') RETURNING id INTO sid;
    SELECT * INTO r FROM validate_sub_quest(sid, '11111111-1111-1111-1111-111111111111', '  1234 ', FALSE);
    IF NOT r.out_valid THEN RAISE EXCEPTION 'T3 FAIL normalize: %', r.out_error; END IF;
    RAISE NOTICE 'T3 PASS normalize trim/lower';
END $$;

-- T4: code_entry sai "0000" → WRONG_ANSWER, cờ KHÔNG set
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tk-code-bad') RETURNING id INTO sid;
    SELECT * INTO r FROM validate_sub_quest(sid, '11111111-1111-1111-1111-111111111111', '0000', FALSE);
    IF r.out_valid THEN RAISE EXCEPTION 'T4 FAIL mã sai lại valid'; END IF;
    IF r.out_error <> 'WRONG_ANSWER' THEN RAISE EXCEPTION 'T4 FAIL error=%', r.out_error; END IF;
    IF (SELECT sub_quest_passed FROM focus_sessions WHERE id = sid) IS TRUE THEN
        RAISE EXCEPTION 'T4 FAIL cờ bị set dù sai'; END IF;
    RAISE NOTICE 'T4 PASS code sai → WRONG_ANSWER, cờ giữ false';
END $$;

-- T5: đã pass → idempotent valid (dù gửi mã sai)
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token, sub_quest_passed)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tk-done', TRUE) RETURNING id INTO sid;
    SELECT * INTO r FROM validate_sub_quest(sid, '11111111-1111-1111-1111-111111111111', '0000', FALSE);
    IF NOT r.out_valid THEN RAISE EXCEPTION 'T5 FAIL idempotent: %', r.out_error; END IF;
    RAISE NOTICE 'T5 PASS đã pass → idempotent valid';
END $$;

-- T6: session không RUNNING → SESSION_NOT_RUNNING
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tk-exp', 'EXPIRED') RETURNING id INTO sid;
    SELECT * INTO r FROM validate_sub_quest(sid, '11111111-1111-1111-1111-111111111111', NULL, TRUE);
    IF r.out_valid THEN RAISE EXCEPTION 'T6 FAIL expired lại valid'; END IF;
    IF r.out_error <> 'SESSION_NOT_RUNNING' THEN RAISE EXCEPTION 'T6 FAIL error=%', r.out_error; END IF;
    RAISE NOTICE 'T6 PASS not-running';
END $$;

-- T7: session không tồn tại → SESSION_NOT_FOUND
DO $$
DECLARE r RECORD;
BEGIN
    SELECT * INTO r FROM validate_sub_quest('00000000-0000-4000-8000-000000000000',
        '11111111-1111-1111-1111-111111111111', NULL, TRUE);
    IF r.out_valid THEN RAISE EXCEPTION 'T7 FAIL not-found valid'; END IF;
    IF r.out_error <> 'SESSION_NOT_FOUND' THEN RAISE EXCEPTION 'T7 FAIL error=%', r.out_error; END IF;
    RAISE NOTICE 'T7 PASS not-found';
END $$;

-- T8: không có quest hôm nay → NO_QUEST_TODAY (venue có quest active ngày KHÁC)
DO $$
DECLARE r RECORD; sid UUID; vid UUID := '33333333-3333-3333-3333-333333333333'; other_dow INT;
BEGIN
    other_dow := (EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::INT + 1) % 7;
    INSERT INTO venues (id, name, latitude, longitude, sub_quest_config)
    VALUES (vid, 'TEST no-quest', 10, 106,
            jsonb_build_object('rotation_mode', 'weekday', 'quests',
              jsonb_build_array(jsonb_build_object(
                'id', 'x', 'type', 'physical_action',
                'active_weekdays', jsonb_build_array(other_dow),
                'content', jsonb_build_object('title', 't')))))
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO focus_sessions (venue_id, guest_token) VALUES (vid, 'tk-noquest') RETURNING id INTO sid;
    SELECT * INTO r FROM validate_sub_quest(sid, vid, NULL, TRUE);
    IF r.out_valid THEN RAISE EXCEPTION 'T8 FAIL valid dù không có quest hôm nay'; END IF;
    IF r.out_error <> 'NO_QUEST_TODAY' THEN RAISE EXCEPTION 'T8 FAIL error=%', r.out_error; END IF;
    RAISE NOTICE 'T8 PASS no-quest-today';
END $$;

ROLLBACK;
\echo '✅ ALL validate_sub_quest TESTS PASSED'
