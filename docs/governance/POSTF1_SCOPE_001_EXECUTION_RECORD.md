# POSTF1_SCOPE_001 — Execution Record

- Contract: `POSTF1_SCOPE_001` (candidate hash `dc6c5dd9698d89092c0aa7f1d530554096e2a70a5e858f78375b49cbc413f4d3`)
- Parent gate: `PFG-NAZRA-001` (PASS / Documentation Gate Accepted)
- Human authorization: GRANTED (2026-09-04)
- Verdict: EXECUTED — PASS (checkpoint). **NOT CERTIFIED.**

## Unit A — NOTIF-001 / NOTIF-002

Files changed (within scope):
- `supabase/migrations` → `drizzle/migrations/0006_postf1_scope_001_unit_a_notification_rpc.sql`
- `src/lib/repositories/notificationsRepository.ts` — `insertMany` removed; `create` / `createMany` wrap the RPC
- `src/hooks/useAlertNotifier.ts` — no client-supplied `tenant_id`; RPC-backed path
- `src/lib/repositories/index.ts` — type export renamed (`NotificationInsert` → `NotificationCreate`), required by the removal

Authority contract as implemented:
- `public.create_tenant_notification(uuid,text,text,text,text)` — `SECURITY DEFINER`, `SET search_path = public`
- Tenant derived server-side via `public.get_current_tenant()`; client cannot supply `tenant_id`
- Target user must be a member of the caller tenant (`public.user_tenants`), else `42501`
- Unauthenticated / no-tenant callers rejected with `42501`

Live evidence:
- `pg_proc`: `prosecdef = true`, `proconfig = {search_path=public}`
- EXECUTE: `authenticated`, `service_role` only — `anon` denied (V6)
- `pg_class.relacl` on `public.notifications`: `authenticated=rwdDxtm` — no `a` (INSERT) → direct client INSERT denied at privilege layer (V5)
- Cross-tenant / same-tenant-non-member targets rejected by the membership predicate (V3, V4)
- `service_role` retains full privileges for edge functions

## Unit B — DASH-001

- `src/hooks/useDashboardData.ts` — type + select query use `paid_amount`
- `src/components/dashboard/RecentInvoicesWidget.tsx` — render logic uses `paid_amount`
- No schema change, no query service, no dashboard refactor (V7, V8)

## Quality gates

- `tsgo --noEmit -p tsconfig.app.json`: 0 errors
- `bun run build`: PASS (22.65s; pre-existing chunk-size warnings only)
- `vitest run`: 1619 passed / 5 skipped
- `scripts/fitness/run-all.mjs`: active=33 pending=9 failures=0

## Deltas

- PRE-TS-001 recurrence #12 in platform-owned `src/integrations/supabase/previewAuthStorage.ts` — contained with minimal return-type annotations only. Separate DELTA; RISK-008 remains OPEN.
- DASH-002, F2 scope, RISK-007, PRE-EXT-001: untouched, still open/unauthorized.

Certification remains a separate human governance decision.
