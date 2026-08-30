# PHASE 1A AUTHORIZATION CONTRACT — Tenant Isolation (BND-05)

- **Contract ID:** `PH1A-NAZRA-001`
- **State:** **SIGNED · AUTHORIZED — closed scope only**
- **Signed by:** Human Governance (project owner) · 2026-08-30
- **Precondition record:** `HRD-NAZRA-001` — D-1 … D-5 settled
- **Reference baseline:** `BASELINE-UX4-001` **SEALED** — composite `e8f506d113e785015fca864a823990bda09f5878e76eb8166305edc4e403f392` (30 entries)
- **Parent evidence:** `G0R-NAZRA-002` @ `fb311a1e` · `SNAPSHOT-20260829-001`
- **Certification:** **NOT GRANTED** · Boundaries **0 / 8** · Smart Freeze **ACTIVE**

> Authorization is bounded by this document. Anything not named here is out of scope. The agent may
> implement, verify and report; it may **not** certify BND-05 or any other boundary.

## 1. Objective

Prove and achieve the **BND-05 — Tenant → Data** contract as written in
`docs/architecture/BOUNDARY_CATALOG.md`. Nothing else.

Authority statement (unchanged, non-negotiable): **PostgreSQL RLS is the sole authority.** Tenant
identity is derived server-side from the JWT. Client-side tenant selection has zero authority.

## 2. Settled inputs (from `HRD-NAZRA-001`)

| Input | Decision | Value locked into this contract |
|---|---|---|
| RISK-007 in scope? | D-2 | **No.** Remains OPEN on a dedicated Security Track. Phase 1A must not increase its exposure |
| RISK-008 treatment | D-3 | **Contain before execution.** Control gate in §5 is a hard entry condition |
| PRE-TS-001 | D-4 | **CONTAINED** residual risk, owner Architecture. No C2 reopening, Option C deferred to BND-01 |
| Baseline | D-5 | `BASELINE-UX4-001` **SEALED**; all Phase 1A reporting is Baseline + Delta + Evidence |

## 3. Frozen file scope

**Approved Scope Hash (SHA-256 over the sorted newline-terminated list below):**
`9f3349569ab0af16d91c529c47eb629e34e682c9b04d0aa0aa9a42f8dfb96a5a` — **15 entries**

```text
docs/adr/0045-tenant-authority-and-rls-completeness.md
docs/architecture/BOUNDARY_CATALOG.md
docs/governance/PHASE1A_AUTHORIZATION_CONTRACT.md
docs/governance/PHASE1A_EXECUTION_RECORD.md
docs/governance/PROGRESS_LOG.md
docs/governance/SCOREBOARD.md
scripts/audits/output/tenant-isolation-report.json
scripts/audits/tenant-isolation-audit.mjs
scripts/fitness/check-tenant-column-and-rls-completeness.mjs
scripts/fitness/run-all.mjs
src/__tests__/security/tenant-isolation-negative.test.ts
src/__tests__/security/tenant-isolation.test.ts
src/kernel/tenant/index.ts
src/lib/tenantContext.ts
supabase/migrations/*_ph1a_tenant_isolation.sql
```

Reproduce with:

```bash
printf '%s\n' <lines above> | sort | sha256sum
```

### Item-level scope (partial-file entries)

| File | Permitted change | Forbidden |
|---|---|---|
| `docs/architecture/BOUNDARY_CATALOG.md` | The **BND-05 row block only** (RAG, Violations, Test Coverage, Fitness Check, Evidence, ADR) | Any other boundary row, §4 summary rewrite beyond the BND-05 line |
| `scripts/fitness/run-all.mjs` | Registration of the new BND-05 check only | Any change to existing check behaviour, thresholds, or pending lists |
| `src/kernel/tenant/index.ts` | Additive tenant-context typing needed by server-derived identity | Any browser/global access (kernel purity), any authority logic |
| `src/lib/tenantContext.ts` | Removal of client-asserted tenant authority; caching/derivation from server RPC only | New business logic, new call sites |
| `supabase/migrations/*_ph1a_tenant_isolation.sql` | **New** migration files matching this exact suffix | Editing any existing migration; touching `auth`/`storage`/`realtime`/`vault` schemas |

Any file not in the list is **out of scope**, including test fixtures discovered mid-execution.

## 4. Forbidden surfaces (absolute)

Ledger Posting · Payment · Stock Movement · Sync Semantics · Permission / PDP (Phase 1B) ·
unrelated architecture migration · lint cleanup · RISK-007 remediation · RISK-008 full remediation ·
frontend redesign · repository rebuild · modular-monolith strategy change.

## 5. RISK-008 control gate (D-3 — hard entry condition)

```text
Declared Scope → Pre-mutation verification → Mutation → Post-mutation verification → Evidence
```

- No `scripts/fixes/**` mutation may run inside Phase 1A unless its target set is declared in
  advance and verified against §3 **before** it runs.
- Post-mutation, the changed-file set must be re-verified against the Approved Scope Hash.
- Any mutation touching a file outside §3 → **immediate STOP** + STOP report
  (`docs/governance/STOP_REPORT_TEMPLATE.md`). No repair-in-place.

## 6. Exit criteria (measurable — "improved" is not accepted)

| # | Criterion | Measure |
|---|---|---|
| X-1 | `tenant_id` coverage | 100% of `public` business tables carry `tenant_id uuid NOT NULL` + FK + index — enumerated list, no sampling |
| X-2 | RLS enablement | 100% of those tables have RLS ENABLED |
| X-3 | Verb coverage | 4 policies (SELECT/INSERT/UPDATE/DELETE) per table, each asserting `tenant_id = public.get_current_tenant()` |
| X-4 | GRANTs | Explicit GRANTs present and consistent with the policies for every table in X-1 |
| X-5 | Server-side authority | Tenant identity derived from JWT server-side; zero client-supplied tenant parameters with authority |
| X-6 | RPC tenant checks | Every tenant-scoped RPC asserts tenant membership; enumerated with results |
| X-7 | Negative tests | At least one **cross-tenant denial** test per table family, failing loudly on regression |
| X-8 | Chain closure | `Invariant → Fitness Rule → Automated Test → CI Evidence` demonstrated for BND-05 |

Existing tests passing is **not** sufficient evidence for a 🟢 RAG.

## 7. Required evidence set

| Evidence | Command | Artifact |
|---|---|---|
| Tenant/RLS completeness audit | `node scripts/audits/tenant-isolation-audit.mjs` | `scripts/audits/output/tenant-isolation-report.json` |
| Fitness (incl. new BND-05 check) | `node scripts/fitness/run-all.mjs` | stdout + fitness output |
| Typecheck contract | `node scripts/audits/typecheck-app.mjs` | `scripts/audits/output/typecheck-app.json` |
| Build | `npm run build` | exit code |
| Tests (incl. negative cross-tenant) | `npx vitest run` | totals |
| DB linter | `supabase--linter` | findings list |
| Scope integrity | changed-file set vs §3 + `verify-item-scope.mjs` | MATCH / DRIFT |
| Delta | vs `BASELINE-UX4-001` | Baseline + Delta + Evidence table |

## 8. Execution chain after this signature

```text
PH1A-NAZRA-001 (signed)
        ↓
Tenant Isolation implementation — frozen scope only
        ↓
Evidence regeneration (Baseline + Delta + Evidence)
        ↓
G0-class evidence integrity check
        ↓
Human Boundary Review
        ↓
BND-05 Certification decision
        ↓
Phase 1B (Authorization / PDP) — separately authorized
```

## 9. Standing prohibitions during Phase 1A

- No opportunistic lint remediation (`LINT_CLASSIFICATION.md`).
- No security remediation — D-2 places RISK-007 out of scope.
- No agent self-certification, in any form or wording.
- No lifting of Smart Freeze for any domain not certified against its boundary exit criteria.
- No scope widening; drift halts execution and produces a STOP report.
