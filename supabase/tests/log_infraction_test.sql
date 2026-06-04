-- =====================================================================
-- log_infraction_test.sql — test SQL function (specs §4 Module 2)
-- Chạy: docker exec -i opr-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/x.sql
-- (cần schema.sql; seed venue 11111111 nếu có — else tạo tạm).
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO venues (id, name, latitude, longitude)
VALUES ('11111111-1111-1111-1111-111111111111', 'seed', 10, 106)
ON CONFLICT (id) DO NOTHING;

-- T1: phiên RUNNING → increment 1, 2 (atomic), ghi DB
DO $$
DECLARE sid UUID; c INT;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tk-inf') RETURNING id INTO sid;
    c := log_infraction(sid);
    IF c <> 1 THEN RAISE EXCEPTION 'T1 FAIL lần 1 = % (mong 1)', c; END IF;
    c := log_infraction(sid);
    IF c <> 2 THEN RAISE EXCEPTION 'T1 FAIL lần 2 = % (mong 2)', c; END IF;
    IF (SELECT infraction_count FROM focus_sessions WHERE id = sid) <> 2 THEN
        RAISE EXCEPTION 'T1 FAIL DB count'; END IF;
    RAISE NOTICE 'T1 PASS — increment 1→2 (DB=2)';
END $$;

-- T2: phiên KHÔNG RUNNING (EXPIRED) → -1, count giữ nguyên
DO $$
DECLARE sid UUID; c INT;
BEGIN
    INSERT INTO focus_sessions (venue_id, guest_token, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tk-inf-exp', 'EXPIRED') RETURNING id INTO sid;
    c := log_infraction(sid);
    IF c <> -1 THEN RAISE EXCEPTION 'T2 FAIL EXPIRED = % (mong -1)', c; END IF;
    IF (SELECT infraction_count FROM focus_sessions WHERE id = sid) <> 0 THEN
        RAISE EXCEPTION 'T2 FAIL: KHÔNG được tăng phiên non-RUNNING'; END IF;
    RAISE NOTICE 'T2 PASS — EXPIRED → -1, count giữ 0';
END $$;

-- T3: phiên không tồn tại → -1
DO $$
DECLARE c INT;
BEGIN
    c := log_infraction('00000000-0000-4000-8000-000000000000');
    IF c <> -1 THEN RAISE EXCEPTION 'T3 FAIL not-found = % (mong -1)', c; END IF;
    RAISE NOTICE 'T3 PASS — not-found → -1';
END $$;

ROLLBACK;
\echo '✅ ALL log_infraction TESTS PASSED'
