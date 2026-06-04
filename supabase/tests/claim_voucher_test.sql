-- =====================================================================
-- Test claim_voucher() + constraints — chạy với psql -v ON_ERROR_STOP=1.
-- Yêu cầu: đã apply schema.sql + seed.sql (venue 1111... + 20 voucher).
-- Bọc BEGIN/ROLLBACK → non-destructive (không đổi dữ liệu seed).
-- ASSERT fail → psql thoát mã != 0 (= test FAIL).
-- =====================================================================
\set VENUE '11111111-1111-1111-1111-111111111111'

BEGIN;

-- T0: unique index chống race phải tồn tại -----------------------------
DO $$
BEGIN
    ASSERT (SELECT count(*) FROM pg_indexes WHERE indexname='uniq_running_session') = 1,
        'thiếu index uniq_running_session';
    ASSERT (SELECT count(*) FROM pg_indexes WHERE indexname='uniq_voucher_per_session') = 1,
        'thiếu index uniq_voucher_per_session';
    RAISE NOTICE 'T0 OK — unique indexes tồn tại';
END $$;

-- T1: SESSION_NOT_FOUND ------------------------------------------------
DO $$
DECLARE v_code varchar; v_err text;
BEGIN
    SELECT out_code, out_error INTO v_code, v_err
      FROM claim_voucher('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111');
    ASSERT v_err = 'SESSION_NOT_FOUND', 'T1: expected SESSION_NOT_FOUND, got ' || COALESCE(v_err,'NULL');
    ASSERT v_code IS NULL, 'T1: code phải NULL';
    RAISE NOTICE 'T1 OK — SESSION_NOT_FOUND';
END $$;

-- T2: happy path (session 46'' trước, quest passed) → cấp voucher -------
DO $$
DECLARE v_code varchar; v_err text; v_cnt int;
BEGIN
    INSERT INTO focus_sessions (id, venue_id, guest_token, start_time, status, sub_quest_passed)
    VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
            'tok-happy', NOW() - INTERVAL '46 minutes', 'RUNNING', TRUE);

    SELECT out_code, out_error INTO v_code, v_err
      FROM claim_voucher('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');
    ASSERT v_err IS NULL, 'T2: không được lỗi, got ' || COALESCE(v_err,'NULL');
    ASSERT v_code IS NOT NULL, 'T2: phải trả code';
    ASSERT (SELECT status FROM focus_sessions WHERE id='22222222-2222-2222-2222-222222222222') = 'COMPLETED',
        'T2: session phải COMPLETED';
    ASSERT (SELECT completed_at FROM focus_sessions WHERE id='22222222-2222-2222-2222-222222222222') IS NOT NULL,
        'T2: completed_at phải set';
    SELECT count(*) INTO v_cnt FROM vouchers WHERE session_id='22222222-2222-2222-2222-222222222222';
    ASSERT v_cnt = 1, 'T2: phải đúng 1 voucher cho session, got ' || v_cnt;
    ASSERT (SELECT status FROM vouchers WHERE session_id='22222222-2222-2222-2222-222222222222') = 'RESERVED',
        'T2: voucher phải RESERVED';
    RAISE NOTICE 'T2 OK — happy path, code = %', v_code;
END $$;

-- T3: idempotent — gọi lại cùng session → cùng code, vẫn 1 voucher ------
DO $$
DECLARE v_code1 varchar; v_code2 varchar; v_err text; v_cnt int;
BEGIN
    SELECT code INTO v_code1 FROM vouchers WHERE session_id='22222222-2222-2222-2222-222222222222';
    SELECT out_code, out_error INTO v_code2, v_err
      FROM claim_voucher('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');
    ASSERT v_err IS NULL, 'T3: không được lỗi (idempotent)';
    ASSERT v_code2 = v_code1, 'T3: phải trả CÙNG code (' || v_code1 || ' vs ' || COALESCE(v_code2,'NULL') || ')';
    SELECT count(*) INTO v_cnt FROM vouchers WHERE session_id='22222222-2222-2222-2222-222222222222';
    ASSERT v_cnt = 1, 'T3: vẫn phải đúng 1 voucher, got ' || v_cnt;
    RAISE NOTICE 'T3 OK — idempotent, cùng code = %', v_code2;
END $$;

-- T4: QUEST_NOT_PASSED -------------------------------------------------
DO $$
DECLARE v_code varchar; v_err text;
BEGIN
    INSERT INTO focus_sessions (id, venue_id, guest_token, start_time, status, sub_quest_passed)
    VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
            'tok-noquest', NOW() - INTERVAL '46 minutes', 'RUNNING', FALSE);
    SELECT out_code, out_error INTO v_code, v_err
      FROM claim_voucher('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');
    ASSERT v_err = 'QUEST_NOT_PASSED', 'T4: expected QUEST_NOT_PASSED, got ' || COALESCE(v_err,'NULL');
    ASSERT v_code IS NULL, 'T4: code phải NULL';
    RAISE NOTICE 'T4 OK — QUEST_NOT_PASSED';
END $$;

-- T5: SESSION_NOT_RUNNING (EXPIRED, chưa có voucher) -------------------
DO $$
DECLARE v_code varchar; v_err text;
BEGIN
    INSERT INTO focus_sessions (id, venue_id, guest_token, start_time, status, sub_quest_passed)
    VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
            'tok-expired', NOW() - INTERVAL '46 minutes', 'EXPIRED', TRUE);
    SELECT out_code, out_error INTO v_code, v_err
      FROM claim_voucher('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111');
    ASSERT v_err = 'SESSION_NOT_RUNNING', 'T5: expected SESSION_NOT_RUNNING, got ' || COALESCE(v_err,'NULL');
    RAISE NOTICE 'T5 OK — SESSION_NOT_RUNNING';
END $$;

-- T6: OUTSIDE_WINDOW (10'' trước) → err + session FAILED ---------------
DO $$
DECLARE v_code varchar; v_err text;
BEGIN
    INSERT INTO focus_sessions (id, venue_id, guest_token, start_time, status, sub_quest_passed)
    VALUES ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
            'tok-early', NOW() - INTERVAL '10 minutes', 'RUNNING', TRUE);
    SELECT out_code, out_error INTO v_code, v_err
      FROM claim_voucher('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111');
    ASSERT v_err = 'OUTSIDE_WINDOW', 'T6: expected OUTSIDE_WINDOW, got ' || COALESCE(v_err,'NULL');
    ASSERT (SELECT status FROM focus_sessions WHERE id='55555555-5555-5555-5555-555555555555') = 'FAILED',
        'T6: session phải bị set FAILED';
    RAISE NOTICE 'T6 OK — OUTSIDE_WINDOW + session FAILED';
END $$;

-- T7: POOL_EMPTY (vét sạch voucher AVAILABLE) --------------------------
DO $$
DECLARE v_code varchar; v_err text;
BEGIN
    UPDATE vouchers SET status='RESERVED'
     WHERE venue_id='11111111-1111-1111-1111-111111111111' AND status='AVAILABLE';
    INSERT INTO focus_sessions (id, venue_id, guest_token, start_time, status, sub_quest_passed)
    VALUES ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111',
            'tok-pool', NOW() - INTERVAL '46 minutes', 'RUNNING', TRUE);
    SELECT out_code, out_error INTO v_code, v_err
      FROM claim_voucher('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111');
    ASSERT v_err = 'POOL_EMPTY', 'T7: expected POOL_EMPTY, got ' || COALESCE(v_err,'NULL');
    RAISE NOTICE 'T7 OK — POOL_EMPTY';
END $$;

DO $$ BEGIN RAISE NOTICE '==== TẤT CẢ TEST claim_voucher PASS ===='; END $$;

ROLLBACK;
