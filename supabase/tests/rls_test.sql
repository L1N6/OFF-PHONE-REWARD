-- =====================================================================
-- rls_test.sql — TF-4: xác nhận RLS enabled + 4 policies tồn tại.
-- Chạy sau khi apply schema.sql (Docker hoặc Supabase SQL Editor).
-- Không cần BEGIN/ROLLBACK (chỉ đọc pg_catalog, không ghi data).
--
-- Docker:
--   docker cp supabase/tests/rls_test.sql opr-pg:/tmp/rls_test.sql
--   docker exec opr-pg psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f /tmp/rls_test.sql
-- =====================================================================

DO $$
DECLARE
    v_rls   BOOLEAN;
    v_count INT;
BEGIN
    -- 1. RLS enabled on 3 tables
    SELECT relrowsecurity INTO v_rls
      FROM pg_class WHERE relname = 'focus_sessions' AND relkind = 'r';
    ASSERT v_rls IS TRUE, 'focus_sessions: relrowsecurity phải TRUE';

    SELECT relrowsecurity INTO v_rls
      FROM pg_class WHERE relname = 'vouchers' AND relkind = 'r';
    ASSERT v_rls IS TRUE, 'vouchers: relrowsecurity phải TRUE';

    SELECT relrowsecurity INTO v_rls
      FROM pg_class WHERE relname = 'venues' AND relkind = 'r';
    ASSERT v_rls IS TRUE, 'venues: relrowsecurity phải TRUE';

    -- 2. anon_insert_session tồn tại trên focus_sessions
    SELECT count(*) INTO v_count FROM pg_policies
      WHERE tablename = 'focus_sessions' AND policyname = 'anon_insert_session';
    ASSERT v_count = 1, 'policy anon_insert_session phải tồn tại';

    -- 3. venue_isolation_sessions tồn tại trên focus_sessions
    SELECT count(*) INTO v_count FROM pg_policies
      WHERE tablename = 'focus_sessions' AND policyname = 'venue_isolation_sessions';
    ASSERT v_count = 1, 'policy venue_isolation_sessions phải tồn tại';

    -- 4. venue_isolation_vouchers tồn tại trên vouchers
    SELECT count(*) INTO v_count FROM pg_policies
      WHERE tablename = 'vouchers' AND policyname = 'venue_isolation_vouchers';
    ASSERT v_count = 1, 'policy venue_isolation_vouchers phải tồn tại';

    -- 5. venue_update_by_admin tồn tại trên venues
    SELECT count(*) INTO v_count FROM pg_policies
      WHERE tablename = 'venues' AND policyname = 'venue_update_by_admin';
    ASSERT v_count = 1, 'policy venue_update_by_admin phải tồn tại';

    RAISE NOTICE 'rls_test: ALL 7 PASS (3 RLS enabled + 4 policies)';
END $$;
