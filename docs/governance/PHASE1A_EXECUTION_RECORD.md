# PH1A Execution Record — BND-05 Tenant → Data

- Record ID: `PH1A-NAZRA-001`
- Contract: `PHASE1A_AUTHORIZATION_CONTRACT.md` — scope hash `9f334956…` (frozen, unchanged)
- Baseline: `BASELINE-UX4-001` (sealed)
- Status: **PH1A CANDIDATE COMPLETE — NOT CERTIFIED** (certification is a human decision)
- Smart Freeze: ACTIVE · RISK-007 OPEN · RISK-008 OPEN (Control Gate applied) · PRE-TS-001 CONTAINED

## 1. Scope integrity

The 15 frozen scope items were verified before and after every mutation
(RISK-008 Control Gate: declared scope → pre-verify → mutate → post-verify →
evidence). No item outside the frozen scope was modified. No architectural
decision outside BND-05 was changed. No lint cleanup was performed.

## 2. Mutations applied

| # | Artifact | Purpose |
|---|---|---|
| D-0 | `drizzle/migrations/0000_ph1a_tenant_isolation.sql` | 86 tables: backfill, `DEFAULT get_current_tenant()`, `NOT NULL`, FK → `tenants(id) ON DELETE RESTRICT`, index, 4 RESTRICTIVE RLS policies each |
| D-1 | `0001_ph1a_tenant_isolation_log_guard.sql` | `BEFORE INSERT` guard on `activity_logs` / `audit_trail` so platform-plane logging never blocks a business write |
| D-2 | `0003_ph1a_tenant_isolation_log_guard_fix.sql` | Guard made row-type agnostic (`to_jsonb(NEW)`); the two log tables do not share a column set |
| D-3 | `0004_ph1a_tenant_isolation_drop_probe_fn.sql` | Removed the SECURITY DEFINER probe function — PostgreSQL forbids `SET ROLE` inside a definer function, so the surface was privileged and unusable |
| D-4 | `src/kernel/tenant/index.ts`, `src/lib/tenantContext.ts` | `ServerDerivedTenantId` brand; tenant identity is server-derived only |
| D-5 | `scripts/audits/tenant-isolation-audit.mjs` | Audit + live cross-tenant probe harness, evidence artifact producer |
| D-6 | `scripts/fitness/check-tenant-column-and-rls-completeness.mjs` (+ registered in `run-all.mjs`, enforcing) | Offline CI enforcement of the evidence artifact |
| D-7 | `src/__tests__/security/tenant-isolation-negative.test.ts` | Negative cross-tenant tests per table family |
| D-8 | `docs/adr/0045-…md`, `BOUNDARY_CATALOG.md` | Decision lock + boundary row update |
| — | `src/integrations/supabase/previewAuthStorage.ts` | PRE-TS-001 recurrence #8 preflight fix after schema regeneration (contained, not re-analysed) |

## 3. Exit criteria X-1 … X-8

| Criterion | Result | Evidence |
|---|---|---|
| X-1 `tenant_id` NOT NULL + FK + index on every tenant-scoped table | **PASS** 86/86; 15 exemptions all recorded, 0 unexplained | `tenant-isolation-report.json` |
| X-2 RLS enabled | **PASS** 86/86 | same |
| X-3 four tenant-asserting policies per table | **PASS** 86/86 (restrictive, all four verbs) | same |
| X-4 GRANTs consistent with policies | **PASS** 86/86 | same |
| X-5 tenant identity server-derived from JWT | **PASS** `get_current_tenant()` → `auth.uid()`; client branded `ServerDerivedTenantId` | same + `src/kernel/tenant` |
| X-6 tenant-scoped RPC enumeration | **PASS (enumerated)** 88 tenant-referencing functions, 51 with an explicit tenant predicate; the remaining 37 are trigger/generator functions operating on already-RLS-filtered rows — carried openly as `PH1A-OBS-001`, **not certified** | same |
| X-7 negative cross-tenant tests | **PASS** 18 table families × 4 verbs; every SELECT/UPDATE/DELETE affected 0 rows, every INSERT rejected | probe evidence + `tenant-isolation-negative.test.ts` |
| X-8 full evidence regeneration, all gates green | **PASS** typecheck 0 · build PASS · vitest 1619 passed / 5 skipped · fitness active=33 failures=0 | `/scripts/audits/output/*` |

## 4. Recorded limits (stated, not smoothed over)

1. `journals` and `journal_entries`: the cross-tenant INSERT is rejected by a
   business-invariant trigger that fires **before** RLS. The write is denied,
   but the denial reason is the trigger, not the policy. Recorded as
   `denied_by: business-invariant trigger` in the evidence.
2. X-7 evidence is produced against a live database by an admin session that
   drops to `authenticated` inside an aborted transaction. CI enforces the
   committed artifact offline; if the artifact is stale or missing the fitness
   check fails by design rather than passing silently.
3. `PH1A-OBS-001` (37 functions without an explicit tenant predicate) is an
   open observation, deliberately outside this phase's certification claim.

## 5. Decision required

PH1A is **candidate complete**. Certification of BND-05, and any authorization
of PH1B, are separate human decisions. No self-certification is claimed.
