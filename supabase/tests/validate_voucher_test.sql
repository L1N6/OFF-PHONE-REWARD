-- validate_voucher_test.sql — POS redeem (specs §4 Module 4, T4-2).
-- Chạy: docker cp vào container → psql -v ON_ERROR_STOP=1 -f. BEGIN/ROLLBACK giữ seed sạch.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
    v_venue UUID := '11111111-1111-1111-1111-111111111111';
    r RECORD;
BEGIN
    -- Fixtures (TST-USED đã redeem trước → set redeemed_at để giả lập)
    INSERT INTO vouchers (venue_id, code, status, expires_at, redeemed_at) VALUES
        (v_venue, 'TST-RESV-OK', 'RESERVED',  NOW() + INTERVAL '1 day', NULL),
        (v_venue, 'TST-AVAIL',   'AVAILABLE', NULL,                     NULL),
        (v_venue, 'TST-USED',    'REDEEMED',  NULL,                     NOW()),
        (v_venue, 'TST-EXPIRED', 'RESERVED',  NOW() - INTERVAL '1 hour', NULL);

    -- 1) RESERVED hợp lệ → VALID + voucher chuyển REDEEMED
    SELECT * INTO r FROM validate_voucher('TST-RESV-OK', v_venue);
    ASSERT r.out_status = 'VALID', 'expected VALID got ' || r.out_status;
    ASSERT r.out_redeemed_at IS NOT NULL, 'VALID phải có redeemed_at';
    ASSERT (SELECT status FROM vouchers WHERE code='TST-RESV-OK' AND venue_id=v_venue) = 'REDEEMED',
        'voucher phải REDEEMED sau validate';

    -- 1b) double-redeem: validate lại cùng mã → USED (đã REDEEMED, không redeem lần 2)
    SELECT * INTO r FROM validate_voucher('TST-RESV-OK', v_venue);
    ASSERT r.out_status = 'USED', 'double-redeem lần 2 phải USED got ' || r.out_status;

    -- 2) AVAILABLE → NOT_CLAIMED
    SELECT * INTO r FROM validate_voucher('TST-AVAIL', v_venue);
    ASSERT r.out_status = 'NOT_CLAIMED', 'expected NOT_CLAIMED got ' || r.out_status;

    -- 3) REDEEMED sẵn → USED (+redeemed_at)
    SELECT * INTO r FROM validate_voucher('TST-USED', v_venue);
    ASSERT r.out_status = 'USED', 'expected USED got ' || r.out_status;
    ASSERT r.out_redeemed_at IS NOT NULL, 'USED phải có redeemed_at';

    -- 4) Không tồn tại → INVALID
    SELECT * INTO r FROM validate_voucher('TST-NOPE-XX', v_venue);
    ASSERT r.out_status = 'INVALID', 'expected INVALID got ' || r.out_status;

    -- 5) RESERVED nhưng hết hạn → INVALID (không bị redeem)
    SELECT * INTO r FROM validate_voucher('TST-EXPIRED', v_venue);
    ASSERT r.out_status = 'INVALID', 'expected INVALID (expired) got ' || r.out_status;
    ASSERT (SELECT status FROM vouchers WHERE code='TST-EXPIRED' AND venue_id=v_venue) = 'RESERVED',
        'voucher hết hạn KHÔNG được redeem';

    RAISE NOTICE 'validate_voucher_test: ALL PASS';
END $$;

ROLLBACK;
