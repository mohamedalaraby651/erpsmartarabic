-- CERT-REV-BND05 · journal proof (Test A / Test B)
-- Read-only by design: everything runs inside a transaction that is ROLLED BACK.
-- Test A: foreign tenant_id + ordinary payload  -> expected denial (business trigger)
-- Test B: foreign tenant_id + payload that SATISFIES the business trigger
--         -> expected denial by RESTRICTIVE RLS (error 42501)
\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on

BEGIN;

-- foreign tenant (A) created by the privileged session, never committed
INSERT INTO public.tenants (id, name, slug, is_active)
VALUES ('bbbbbbbb-0000-0000-0000-00000000000a', 'CERT-REV foreign tenant', 'cert-rev-foreign', true);

-- an OPEN fiscal period belonging to the foreign tenant, covering today
INSERT INTO public.fiscal_periods (id, tenant_id, name, start_date, end_date, is_closed)
VALUES ('bbbbbbbb-0000-0000-0000-00000000000f', 'bbbbbbbb-0000-0000-0000-00000000000a',
        'CERT-REV period', CURRENT_DATE - 1, CURRENT_DATE + 1, false);

-- act as an authenticated user homed in the DEFAULT tenant (not the foreign one)
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT user_id::text FROM public.user_tenants
                            WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
                    'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

SELECT 'acting_tenant=' || coalesce(public.get_current_tenant()::text, 'NULL');

-- ---------------------------------------------------------------- Test A
SAVEPOINT test_a;
SELECT 'TEST_A_BEGIN';
INSERT INTO public.journals (tenant_id, journal_date, description, is_posted, total_debit, total_credit)
VALUES ('bbbbbbbb-0000-0000-0000-00000000000a', CURRENT_DATE, 'cert-rev test A', false, 0, 0);
SELECT 'TEST_A_ACCEPTED_UNEXPECTED';
ROLLBACK TO SAVEPOINT test_a;

-- ---------------------------------------------------------------- Test B
-- payload satisfies enforce_fiscal_period_open(): the fiscal period exists,
-- belongs to the FOREIGN tenant, is open, and the date is inside its range.
SAVEPOINT test_b;
SELECT 'TEST_B_BEGIN';
INSERT INTO public.journals (tenant_id, journal_date, description, fiscal_period_id,
                             is_posted, total_debit, total_credit)
VALUES ('bbbbbbbb-0000-0000-0000-00000000000a', CURRENT_DATE, 'cert-rev test B',
        'bbbbbbbb-0000-0000-0000-00000000000f', false, 0, 0);
SELECT 'TEST_B_ACCEPTED_UNEXPECTED';
ROLLBACK TO SAVEPOINT test_b;

-- ------------------------------------------------- Test C (journal_entries)
-- a journal row owned by the foreign tenant, inserted privileged, then a
-- foreign-tenant child row attempted as the authenticated user.
RESET ROLE;
INSERT INTO public.journals (id, tenant_id, journal_number, journal_date, description,
                             fiscal_period_id, is_posted, total_debit, total_credit)
VALUES ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-00000000000a',
        'CERT-REV-1', CURRENT_DATE, 'cert-rev parent',
        'bbbbbbbb-0000-0000-0000-00000000000f', false, 0, 0);
SET LOCAL ROLE authenticated;
SAVEPOINT test_c;
SELECT 'TEST_C_BEGIN';
INSERT INTO public.journal_entries (tenant_id, journal_id, line_number, account_id,
                                    debit_amount, credit_amount)
VALUES ('bbbbbbbb-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-00000000000b', 1,
        (SELECT id FROM public.chart_of_accounts LIMIT 1), 0, 0);
SELECT 'TEST_C_ACCEPTED_UNEXPECTED';
ROLLBACK TO SAVEPOINT test_c;

-- ------------------------------------------------- Test D (read visibility)
SELECT 'TEST_D_VISIBLE_FOREIGN_JOURNALS=' ||
       (SELECT count(*) FROM public.journals
         WHERE tenant_id = 'bbbbbbbb-0000-0000-0000-00000000000a')::text;

RESET ROLE;
ROLLBACK;
SELECT 'ROLLED_BACK';
