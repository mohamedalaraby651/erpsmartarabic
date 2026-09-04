# Post-F1 Findings Gate — NOTIF-001 / DASH-001

F1 remains CLOSED (37/37, PASS, not certified). These are new post-F1 findings, registered and scoped separately. No F2 opening, no architecture migration.

## What I verified live (before proposing anything)

**NOTIF-001 — notifications persistence**
- `src/hooks/useAlertNotifier.ts` → `notificationsRepository.insertMany()` → direct client `insert` into `notifications`.
- Live policy catalogue on `public.notifications` (7 policies): SELECT/UPDATE/DELETE are user-scoped (`tenant_id = get_current_tenant() AND user_id = auth.uid()`), plus older tenant-only variants. The effective INSERT policy is `notifications_tenant_restrict_insert` — `WITH CHECK (tenant_id = get_current_tenant())`, roles `authenticated, anon`. There is no `notifications_insert_tenant_safe` policy in the live database.
- **Decisive fact:** `information_schema.role_table_grants` returns **zero rows** for `public.notifications`. No `GRANT` exists for `anon`, `authenticated`, or `service_role`. PostgREST therefore denies every write (and read) with a permission error regardless of RLS.

So the confirmed root cause is table-level privilege absence, not a missing/failing INSERT policy. A second, independent defect is visible in the same evidence: the INSERT policy checks only `tenant_id`, so any tenant member could write a notification with an arbitrary `user_id` (in-tenant spoofing) once grants exist.

**DASH-001 — Recent Invoices**
- `src/hooks/useDashboardData.ts:159` selects `amount_paid`; the type at line 43 and `RecentInvoicesWidget.tsx:15,106,246` also use `amount_paid`.
- Schema/canonical field is `paid_amount`, used everywhere else in the app. Confirmed mismatch across query → type → widget.

## Deliverable of this gate (documentation only)

Create `docs/governance/POST_F1_FINDINGS_GATE.md` containing:

1. Statement that F1 scope stays closed and exhausted; these findings do not reopen it.
2. **NOTIF-001** — Severity High, class Security/Authorization + Reliability, boundary BND-06 with BND-05 implications.
   - Confirmed root cause: no table grants on `public.notifications`; PostgREST-level denial.
   - Secondary finding NOTIF-002: INSERT policy lacks a `user_id = auth.uid()` (or admin-in-tenant) predicate — in-tenant notification spoofing.
   - Recommended direction (not authorized here): system-generated alerts should be created through a narrow server-side authority (`SECURITY DEFINER` RPC deriving tenant and target user), plus minimum grants; explicitly rejected: `WITH CHECK (true)` or any broad client INSERT.
3. **DASH-001** — Severity Medium, class Data Contract.
   - Root cause: `amount_paid` vs canonical `paid_amount`.
   - Fix direction: rename the contract to `paid_amount` in query, type, and widget. No new column, no `ALTER TABLE`.
   - Registered secondary architectural observation DASH-002: `useDashboardData` queries Supabase directly (hook → DB edge). Recorded as an F2-candidate item, not fixed here.
4. Proposed frozen scope for the next unit (`POSTF1_SCOPE_001`) listing exact files/edges, expected mutations, verification commands, and exit conditions — written as a candidate, **no SHA-256 freeze, no source mutation** in this gate.
5. Human authorization block left unsigned.

Also append the two findings to `docs/governance/PRE_EXISTING_ISSUES.md` and a gate row to `docs/governance/PROGRESS_LOG.md`.

## Explicitly out of scope in this step

No source changes, no migrations, no RPC creation, no grants applied, no F2 opening, no facade work, no PRE-TS-001 handling beyond noting recurrence if it appears.

## Next step after approval

You review the gate document, then issue a frozen scope + authorization for the implementation unit (grants + narrow authority for NOTIF-001; contract rename for DASH-001), each with its own evidence pack.
