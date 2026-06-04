-- =====================================================================
-- get_session_status_test.sql — test SQL function (specs §4 Module 2)
-- Chạy isolated trên Postgres 16 (Docker), KHÔNG đụng Supabase pilot:
--   docker exec -i opr-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/tests/get_session_status_test.sql
-- Bọc BEGIN/ROLLBACK → không để rác. ASSERT bằng RAISE EXCEPTION (psql exit≠0 nếu fail).
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

-- Venue tạm cho FK (rollback xoá sạch).
INSERT INTO venues (id, name, latitude, longitude)
VALUES ('22222222-2222-2222-2222-222222222222', 'TEST venue', 10.0, 106.0)
ON CONFLICT (id) DO NOTHING;

-- T1: session KHÔNG tồn tại → 0 dòng (→ route 404)
DO $$
DECLARE n INT;
BEGIN
    SELECT count(*) INTO n FROM get_session_status('00000000-0000-4000-8000-000000000000');
    IF n <> 0 THEN RAISE EXCEPTION 'T1 FAIL: not-found phải 0 dòng, got %', n; END IF;
    RAISE NOTICE 'T1 PASS — not-found → 0 dòng';
END $$;

-- T2: phiên mới (Δt ~0) → RUNNING
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token, start_time)
    VALUES ('22222222-2222-2222-2222-222222222222', 'tk-new', NOW())
    RETURNING id INTO sid;
    SELECT * INTO r FROM get_session_status(sid);
    IF r.out_status <> 'RUNNING' THEN RAISE EXCEPTION 'T2 FAIL status %', r.out_status; END IF;
    IF r.out_delta_seconds < 0 OR r.out_delta_seconds > 5 THEN
        RAISE EXCEPTION 'T2 FAIL Δt % (mong ~0)', r.out_delta_seconds; END IF;
    RAISE NOTICE 'T2 PASS — phiên mới RUNNING Δt=%', r.out_delta_seconds;
END $$;

-- T3: lùi 1000s → Δt≈1000, vẫn RUNNING (chưa tới 2880)
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token, start_time)
    VALUES ('22222222-2222-2222-2222-222222222222', 'tk-1000', NOW() - INTERVAL '1000 seconds')
    RETURNING id INTO sid;
    SELECT * INTO r FROM get_session_status(sid);
    IF r.out_status <> 'RUNNING' THEN RAISE EXCEPTION 'T3 FAIL status %', r.out_status; END IF;
    IF r.out_delta_seconds < 995 OR r.out_delta_seconds > 1005 THEN
        RAISE EXCEPTION 'T3 FAIL Δt % (mong ~1000)', r.out_delta_seconds; END IF;
    RAISE NOTICE 'T3 PASS — Δt=% vẫn RUNNING', r.out_delta_seconds;
END $$;

-- T4: LAZY EXPIRY — RUNNING lùi 3000s (>2880) → trả EXPIRED + GHI DB
DO $$
DECLARE r RECORD; sid UUID; dbstatus session_status;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token, start_time)
    VALUES ('22222222-2222-2222-2222-222222222222', 'tk-exp', NOW() - INTERVAL '3000 seconds')
    RETURNING id INTO sid;
    SELECT * INTO r FROM get_session_status(sid);
    IF r.out_status <> 'EXPIRED' THEN RAISE EXCEPTION 'T4 FAIL trả % (mong EXPIRED)', r.out_status; END IF;
    SELECT status INTO dbstatus FROM focus_sessions WHERE id = sid;
    IF dbstatus <> 'EXPIRED' THEN RAISE EXCEPTION 'T4 FAIL DB % (lazy-expiry chưa ghi)', dbstatus; END IF;
    RAISE NOTICE 'T4 PASS — lazy-expiry Δt=% → EXPIRED (DB đã ghi)', r.out_delta_seconds;
END $$;

-- T5: COMPLETED lùi 3000s → KHÔNG bị đổi (chỉ RUNNING mới expire)
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token, start_time, status)
    VALUES ('22222222-2222-2222-2222-222222222222', 'tk-comp', NOW() - INTERVAL '3000 seconds', 'COMPLETED')
    RETURNING id INTO sid;
    SELECT * INTO r FROM get_session_status(sid);
    IF r.out_status <> 'COMPLETED' THEN RAISE EXCEPTION 'T5 FAIL % (COMPLETED phải giữ nguyên)', r.out_status; END IF;
    RAISE NOTICE 'T5 PASS — COMPLETED giữ nguyên dù Δt>2880';
END $$;

-- T6: sub_quest_passed truyền đúng (trong Giờ Vàng)
DO $$
DECLARE r RECORD; sid UUID;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token, start_time, sub_quest_passed)
    VALUES ('22222222-2222-2222-2222-222222222222', 'tk-quest', NOW() - INTERVAL '2750 seconds', TRUE)
    RETURNING id INTO sid;
    SELECT * INTO r FROM get_session_status(sid);
    IF r.out_sub_quest_passed <> TRUE THEN RAISE EXCEPTION 'T6 FAIL sub_quest_passed %', r.out_sub_quest_passed; END IF;
    IF r.out_status <> 'RUNNING' THEN RAISE EXCEPTION 'T6 FAIL status %', r.out_status; END IF;
    RAISE NOTICE 'T6 PASS — sub_quest_passed=true Δt=% (Giờ Vàng, RUNNING)', r.out_delta_seconds;
END $$;

ROLLBACK;
\echo '✅ ALL get_session_status TESTS PASSED'
