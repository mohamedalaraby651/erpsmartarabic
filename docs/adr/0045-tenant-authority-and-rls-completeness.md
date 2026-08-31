# ADR-0045 — Tenant Authority and RLS Completeness (BND-05)

- Status: Accepted
- Date: 2026-08-31
- Phase: PH1A-NAZRA-001 (frozen scope hash `9f334956…`)
- Boundary: BND-05 — Tenant → Data
- Supersedes: nothing. Complements ADR-0031 (Enterprise Boundary Contract).

## Context

Tenant isolation existed only as a convention. Most tables carried a
`tenant_id`, but the column was nullable on many of them, permissive RLS
policies were written per table with inconsistent predicates, and several
tables relied entirely on the application passing the right value. A single
missing predicate, a forgotten `WHERE`, or one compromised client was enough
to cross a tenant boundary. Isolation was therefore *probable*, not *proven* —
which is exactly the class of guarantee an ERP cannot ship on.

## Decision

Tenant isolation is a **database-enforced invariant**, layered so that no
single defect can breach it.

### D-1 — Single tenant authority

`public.get_current_tenant()` is the only authority for "which tenant is
acting". It resolves the tenant from `auth.uid()` server-side. No client
value — component state, storage, query string, request body — may ever
substitute for it. The client mirrors this in types via
`ServerDerivedTenantId` (`src/kernel/tenant`).

### D-2 — Structural enforcement

Every tenant-scoped table in `public` carries:

1. `tenant_id uuid NOT NULL`
2. `DEFAULT public.get_current_tenant()`
3. a foreign key to `public.tenants(id) ON DELETE RESTRICT`
4. an index on `tenant_id`

`ON DELETE RESTRICT` is deliberate: deleting a tenant must never silently
cascade away financial history.

### D-3 — RESTRICTIVE policies, not replacements

Isolation is added as four **RESTRICTIVE** policies per table
(SELECT/INSERT/UPDATE/DELETE), each asserting
`tenant_id = public.get_current_tenant()`.

RESTRICTIVE policies are ANDed with the existing permissive ones. This is the
core of the decision: existing role/permission policies keep their meaning and
were not rewritten, so PH1A adds a guarantee without re-opening authorization
semantics. Permissive-only enforcement would have required editing ~300
policies — a far larger blast radius than the boundary being certified.

### D-4 — Platform-plane logging never blocks a write

`activity_logs` and `audit_trail` are written by triggers that also fire for
platform-plane actions occurring before a tenant context exists (creating a
tenant, for example). A `BEFORE INSERT` guard fills `tenant_id` from server
context, falls back to the tenant being acted upon, and otherwise skips the
log row rather than aborting the business transaction. Field access is
row-type agnostic (`to_jsonb(NEW)`), because the two tables do not share a
column set.

### D-5 — Exemptions are recorded, never implicit

A table without `tenant_id` is a violation unless it appears in the exemption
list with a reason (platform-plane, global reference data, or per-user
settings keyed to `auth.uid()`). The audit fails on any unexplained exemption.

### D-6 — Proof is negative and mechanical

Isolation is verified by probing, as an `authenticated` user re-homed to a
throw-away tenant, that SELECT/UPDATE/DELETE against a foreign tenant affect
zero rows and that INSERT with a foreign `tenant_id` is rejected. The probe
runs in a transaction that is aborted by design. Evidence is committed and
enforced offline in CI by
`scripts/fitness/check-tenant-column-and-rls-completeness.mjs`.

## Consequences

Positive: isolation holds even if application code is wrong or bypassed; new
tables fail the fitness check until they are scoped or exempted; the guarantee
is expressed as evidence rather than as assertion.

Negative: every new tenant-scoped table needs the four restrictive policies
(mechanical, but obligatory); the double policy layer (permissive + restrictive)
is more to read; and evidence must be regenerated against a live database, so a
stale artifact fails CI by design.

Accepted limits: two accounting tables (`journals`, `journal_entries`) have
their cross-tenant INSERT rejected by a business-invariant trigger that fires
*before* RLS. The write is denied, but the denial reason is the trigger rather
than the policy; this is recorded explicitly in the evidence instead of being
smoothed over.

## Non-scope

RISK-007 (security backlog) and RISK-008 (tooling boundary) stay OPEN.
PRE-TS-001 stays CONTAINED. No other boundary is certified by this ADR.
