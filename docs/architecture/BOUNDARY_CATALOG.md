# BOUNDARY_CATALOG.md — Enterprise Boundary Model v1.0

- **Status:** Phase 0 deliverable — DOCUMENTED, **NOT CERTIFIED**
- **Phase:** Phase 0 (Boundary Model + Governance), authorized after `G0-NAZRA-001` PASS
- **Parent baseline:** `BASELINE-NAZRA-002` (composite `1b4fafd5…`)
- **Governing ADRs:** [ADR-0031](../adr/0031-enterprise-boundary-contract.md) (boundary contract standard), [ADR-0044](../adr/0044-modular-monolith-and-service-extraction-conditions.md) (modular monolith)
- **Successor baseline (draft):** `BASELINE-UX4-001`

> **Scope discipline.** This catalog defines *what must be enforced, by whom, with which
> evidence, and when it is considered valid*. Phase 0 does **not** implement new fitness
> checks, tests, or tooling, and does **not** modify business code. Rows marked
> `PLANNED` in *Fitness Check* are specifications for a later authorized phase.
>
> **G0 PASS ≠ Architecture PASS ≠ Security PASS ≠ Production Ready.**

## 1. Field schema (16 fields, mandatory for every boundary)

| # | Field | Definition |
|---|---|---|
| 1 | Boundary ID | Stable identifier `BND-NN`. Never reused, never renamed without a superseding ADR. |
| 2 | Name | Upstream → downstream pair. |
| 3 | Owner | Accountable role for the contract (single owner, no shared ownership). |
| 4 | Contract | The only legal crossing surface (types, façades, modules). |
| 5 | Invariant | The property that must hold at every crossing. |
| 6 | Authority | Who is allowed to *decide* a crossing is legal at runtime (authoritative source). |
| 7 | Scope | Files/paths the boundary governs. |
| 8 | Evidence | Artifact that proves the invariant currently holds. |
| 9 | Failure | Observable behaviour when the invariant is violated. |
| 10 | Recovery | Defined recovery path after a violation. |
| 11 | Current RAG | 🟢 enforced / 🟡 partially enforced / 🔴 documented only. Measured against `BASELINE-NAZRA-002`. |
| 12 | Violations | Count measured at baseline (`scripts/audits/output/dependency-report.json`). |
| 13 | Test Coverage | Automated tests asserting the invariant today. |
| 14 | Fitness Check | Mechanical check; `ACTIVE` (exists) or `PLANNED` (specified here, built later). |
| 15 | ADR | Governing decision record(s). |
| 16 | Exit Criteria | Measurable condition that moves the boundary to 🟢 and unlocks its domain from Smart Freeze. |

## 2. Enforcement chain (mandatory for every invariant)

```text
Invariant  →  Fitness Rule  →  Automated Test  →  CI Evidence
```

A boundary may be marked 🟢 only when all four links exist and CI evidence is fresh
(regenerated on the evidence revision being judged). A boundary whose chain stops at
"Fitness Rule" is 🟡 by definition; one that stops at "Invariant" is 🔴.

## 3. Boundary register

### BND-01 — UI → Application

| Field | Value |
|---|---|
| Boundary ID | `BND-01` |
| Name | UI → Application |
| Owner | Frontend Platform Owner |
| Contract | `src/application/queries/**` façades + `src/application/finance/index.ts`; imports only via public barrels |
| Invariant | UI never reaches a repository, service, or the Supabase client directly; every read/write crosses an application façade |
| Authority | Application layer decides shape and permissibility of a read model; UI has zero authority |
| Scope | `src/pages/**`, `src/components/**`, `src/ui/**`, `src/features/**` |
| Evidence | `scripts/audits/output/dependency-report.json` (layer violations), `docs/architecture/WAVE1_SPRINT3_BATCHB_PHASEC2.md` |
| Failure | Direct DB coupling in UI; tenant filter bypass; untestable views; type drift on schema change |
| Recovery | Introduce/extend a façade in `src/application/queries/**`, redirect imports, re-run dep-graph, record delta in a scoped Batch |
| Current RAG | 🟡 |
| Violations | 155 total layer violations at baseline; of these `pages→repositories` **11**, `components→repositories` 41, `components→services` 5, `pages→supabase-client` 29, `components→supabase-client` 38, `hooks→supabase-client` 31 |
| Test Coverage | Indirect (application façade unit tests); no direct boundary assertion |
| Fitness Check | `check-platform-layering` (ACTIVE, partial) · `check-no-deep-imports` (ACTIVE) · `check-ui-no-supabase-client` (**PLANNED**) |
| ADR | ADR-0028 (application query façades), ADR-0031 |
| Exit Criteria | `pages→repositories` = 0 **and** `*→supabase-client` from UI = 0, asserted by an ACTIVE fitness check that fails CI, with the count locked in a successor baseline |

### BND-02 — Application → Domain

| Field | Value |
|---|---|
| Boundary ID | `BND-02` |
| Name | Application → Domain |
| Owner | Finance Domain Owner |
| Contract | `src/domain/**` public barrels (`src/domain/finance/index.ts`, `src/domain/pdf/index.ts`); commands/handlers in `src/application/**` |
| Invariant | Domain is pure: no React, no I/O, no Supabase, no browser globals. Application orchestrates; it never re-implements a domain rule |
| Authority | Domain aggregate is the sole authority on its own invariants (Money arithmetic, tax, lifecycle transitions) |
| Scope | `src/application/**` → `src/domain/**` |
| Evidence | `check-domain-purity`, `check-application-purity`, `check-application-surface` outputs; `src/application/finance/__tests__/PublicSurface.test.ts` |
| Failure | Business rule duplicated in application code; silent divergence between two implementations of the same rule |
| Recovery | Move rule into the aggregate, delete the duplicate, extend aggregate tests, bump contract version if the public surface changed |
| Current RAG | 🟢 (finance) / 🟡 (non-finance domains not yet modelled) |
| Violations | 0 measured for `domain→ui`; non-finance domains largely unmodelled |
| Test Coverage | Finance aggregate + invariant tests (Money, TaxRate, Invoice lifecycle); public-surface snapshot test |
| Fitness Check | `check-domain-purity` (ACTIVE) · `check-application-purity` (ACTIVE) · `check-domain-api-stability` (ACTIVE) · `check-domain-strictness` (ACTIVE) |
| ADR | ADR-0011, ADR-0028 (façades), ADR-0031 |
| Exit Criteria | Every consequential domain (Ledger, Payment, Stock, Tenant, Permission) has an aggregate with the same four ACTIVE checks green, plus a public-surface snapshot test |

### BND-03 — Domain → Repository

| Field | Value |
|---|---|
| Boundary ID | `BND-03` |
| Name | Domain → Repository |
| Owner | Finance Domain Owner |
| Contract | Repository *interfaces* declared by the domain (ports); implementations live in `src/infrastructure/**` |
| Invariant | Dependency inversion: domain declares the port, infrastructure implements it. Domain never imports an implementation, a codec, or a DB type |
| Authority | Domain owns the port signature; infrastructure owns the mapping, never the semantics |
| Scope | `src/domain/**` (ports) ↔ `src/infrastructure/**` (adapters) |
| Evidence | `check-port-adapter-parity`, `check-repository-failure-taxonomy`, `check-adapter-coverage` outputs; ADR-0010 taxonomy |
| Failure | DB shape leaks into aggregates; error semantics lost; optimistic-locking conflicts surfaced as generic errors |
| Recovery | Reintroduce port, map errors through the ADR-0010 taxonomy, add adapter test, re-run adapter coverage |
| Current RAG | 🟢 (invoice) / 🔴 (all other entities use legacy repositories without ports) |
| Violations | Legacy `src/lib/repositories/**` (non-port) still consumed by 41 components + 11 pages |
| Test Coverage | Invoice repository + codec tests; failure-taxonomy tests |
| Fitness Check | `check-port-adapter-parity` (ACTIVE) · `check-repository-failure-taxonomy` (ACTIVE) · `check-error-mapping` (ACTIVE) · `check-legacy-repository-ban` (**PLANNED**) |
| ADR | ADR-0010, ADR-0012, ADR-0031 |
| Exit Criteria | Every certified domain exposes ports only; legacy repository imports from domain/application = 0 under an ACTIVE check |

### BND-04 — Repository → DB

| Field | Value |
|---|---|
| Boundary ID | `BND-04` |
| Name | Repository → DB |
| Owner | Data Platform Owner |
| Contract | Supabase client + generated `types.ts` + SQL functions/RPCs; **only** `src/lib/repositories/**` and `src/infrastructure/**` may call `supabase.from()` / `.rpc()` |
| Invariant | All SQL access is confined to the repository layer; every mutation is transactional or idempotent; generated types are never hand-edited |
| Authority | PostgreSQL is the single source of truth; the DB (constraints, triggers, RPCs) is the final authority, not client code |
| Scope | `src/lib/repositories/**`, `src/infrastructure/**`, `supabase/functions/**`, `supabase/migrations/**` |
| Evidence | `scripts/audits/data-access-classify.mjs`, `scripts/audits/check-data-access.sh`, `supabase--linter` output |
| Failure | Ad-hoc queries outside the layer; partial writes; drift between generated types and schema; unindexed hot paths |
| Recovery | Relocate the query into a repository, add migration/constraint at DB level, regenerate types, re-run data-access classification |
| Current RAG | 🔴 |
| Violations | 98 direct `supabase-client` usages outside the repository layer (29 pages + 38 components + 31 hooks) |
| Test Coverage | Integration tests for posting/idempotency; RLS tests under `src/__tests__/security/**` |
| Fitness Check | `check-data-access` (script exists, **not wired into `run-all`** → PLANNED as gate) |
| ADR | ADR-0012, ADR-0031 |
| Exit Criteria | Direct `supabase` imports outside `src/lib/repositories/**`, `src/infrastructure/**`, `src/integrations/**` = 0, enforced as an ACTIVE failing check |

### BND-05 — Tenant → Data

| Field | Value |
|---|---|
| Boundary ID | `BND-05` |
| Name | Tenant → Data |
| Owner | Security / Data Platform Owner (joint escalation to Architecture Council) |
| Contract | `tenant_id uuid not null` on every business table + RLS policies on all four verbs + tenant-scoped RPCs |
| Invariant | No row is ever readable or writable outside its tenant. Tenant identity is derived server-side from the JWT, never from a client parameter |
| Authority | **PostgreSQL RLS is the sole authority.** Client-side tenant selection is a UI convenience with zero authority |
| Scope | All `public` tables, all RPCs, all edge functions, `src/kernel/tenant/**` |
| Evidence | `src/__tests__/security/tenant-isolation.test.ts`, `src/__tests__/security/accounting-rls.test.ts`, `supabase--linter` |
| Failure | Cross-tenant read/write — **catastrophic, non-recoverable trust failure** |
| Recovery | Immediate policy patch + full audit-log review of affected rows + incident record; no silent fix |
| Current RAG | 🟡 |
| Violations | Not fully enumerated; RPC-level tenant checks are inconsistent (see `mem://security/multi-tenant-rpc-isolation`) |
| Test Coverage | Tenant isolation + accounting RLS suites (positive and negative cases) |
| Fitness Check | `check-identity-authority` (ACTIVE) · `check-tenant-column-and-rls-completeness` (**PLANNED**, SQL-level) |
| ADR | ADR-0031 (contract standard); tenant authority ADR **owed** in the next phase |
| Exit Criteria | Every `public` business table proven to have `tenant_id` + 4 RLS policies + GRANTs, plus a negative cross-tenant test per table family, produced as CI evidence |

### BND-06 — User → Permission

| Field | Value |
|---|---|
| Boundary ID | `BND-06` |
| Name | User → Permission |
| Owner | Security Owner |
| Contract | `user_roles` table + `has_role()` security-definer function + `get_permission_matrix()` RPC |
| Invariant | Roles are never stored on profile/user rows; every sensitive operation is re-authorized server-side. Client permission state is a **hint only** |
| Authority | SQL `has_role()` / RPC-level checks. `usePermissionMatrix` has zero authority |
| Scope | `src/hooks/usePermissionMatrix.ts`, `src/kernel/permissions/**`, all RPCs and edge functions performing privileged work |
| Evidence | RLS/permission tests, `docs/security-hardening-report.md`, `mem://security/enterprise-hardening` |
| Failure | Privilege escalation; unauthorized bulk operations; financial-limit bypass |
| Recovery | Revoke the path server-side first, then repair UI; log affected actions in the audit trail |
| Current RAG | 🟡 |
| Violations | Not enumerated; UI-only permission checks exist in some flows |
| Test Coverage | Partial (bulk-operation authorization, financial limits) |
| Fitness Check | `check-identity-authority` (ACTIVE) · `check-server-side-authorization-parity` (**PLANNED**) |
| ADR | ADR-0031; permission-authority ADR **owed** |
| Exit Criteria | Every mutating RPC/edge function has an authorization assertion test; zero client-only permission gates on financial operations |

### BND-07 — Offline → Server

| Field | Value |
|---|---|
| Boundary ID | `BND-07` |
| Name | Offline → Server |
| Owner | Platform Runtime Owner |
| Contract | Sync queue entries carrying `client_op_id` (UUID); financial operations use `Idempotency-Key` = `client_op_id`; conflicts recorded in `sync_conflicts` |
| Invariant | Every queued operation is idempotent and replay-safe: applying it N times equals applying it once. Server-wins by default; conflicts are recorded, never silently dropped |
| Authority | Server state is authoritative; the offline queue is a proposal, never a fact |
| Scope | Sync queue, `supabase/functions/_shared/idempotency.ts`, financial edge functions |
| Evidence | `src/__tests__/security/idempotency-replay.test.ts` |
| Failure | Duplicate postings, double payments, lost updates, silent conflict loss |
| Recovery | Idempotency key rejects the replay; conflict row written; reversal entry (never hard delete) if a duplicate landed |
| Current RAG | 🟡 |
| Violations | Not enumerated; idempotency coverage is per-function rather than systemic |
| Test Coverage | Replay test for the financial path only |
| Fitness Check | `check-transaction-finality` (ACTIVE) · `check-idempotency-key-required` (**PLANNED**, per edge function) |
| ADR | ADR-0031; sync-semantics ADR **owed** |
| Exit Criteria | Every mutating edge function proven to require an idempotency key, with a replay test each, and `sync_conflicts` write path covered |

### BND-08 — Event → Consumer

| Field | Value |
|---|---|
| Boundary ID | `BND-08` |
| Name | Event → Consumer |
| Owner | Finance Domain Owner (domain events) + Frontend Platform Owner (UI events) |
| Contract | Domain events from `src/domain/**` (immutable, serialized per ADR-0012); UI composite events per `src/ui/contracts/CompositeEvent.ts` |
| Invariant | Events are immutable, versioned, and self-describing. A consumer never mutates an event, and never depends on a producer's internals |
| Authority | The producing aggregate owns the event schema; consumers have no authority to reinterpret it |
| Scope | `src/domain/**` events, `src/ui/contracts/**`, event bus / shell events |
| Evidence | `check-domain-events-immutable`, `check-composite-event-envelope` outputs; ADR-0012 serialization tests |
| Failure | Consumer coupling to producer internals; unversioned schema change breaking replay; event-sourced state divergence |
| Recovery | Version the event, keep the old shape for one phase (per contract versioning policy), migrate consumers, then remove |
| Current RAG | 🟡 |
| Violations | 0 for immutability checks; no cross-consumer contract test yet |
| Test Coverage | Event immutability + envelope tests; invoice event-sourcing tests |
| Fitness Check | `check-domain-events-immutable` (ACTIVE) · `check-composite-event-envelope` (ACTIVE) · `check-event-schema-versioning` (**PLANNED**) |
| ADR | ADR-0012, ADR-0029, ADR-0031 |
| Exit Criteria | Every published event carries an explicit version; a consumer-contract test exists per event family; replay of the sealed event log reproduces state byte-identically |

## 4. RAG summary at Phase 0

| Boundary | RAG | Blocking gap |
|---|---|---|
| BND-01 UI → Application | 🟡 | 98 direct supabase usages in UI, 11 page→repo |
| BND-02 Application → Domain | 🟢 finance / 🟡 rest | only finance is modelled |
| BND-03 Domain → Repository | 🟢 invoice / 🔴 rest | legacy repositories without ports |
| BND-04 Repository → DB | 🔴 | data-access check not a gate |
| BND-05 Tenant → Data | 🟡 | RPC tenant checks inconsistent |
| BND-06 User → Permission | 🟡 | server-side parity unproven |
| BND-07 Offline → Server | 🟡 | idempotency not systemic |
| BND-08 Event → Consumer | 🟡 | no schema versioning gate |

**0 boundaries are certified.** Documented ≠ enforced.

## 5. Smart Freeze register (unchanged by Phase 0)

Tenant Authority · Permission · Ledger Posting · Payment · Stock Movement · Sync Semantics
remain frozen until the owning domain earns certification against its boundary exit criteria.

## 6. Open findings carried through Phase 0

| ID | Status |
|---|---|
| `PRE-PDF-001` | OPEN — deferred, test suite not green |
| `RISK-007` | OPEN — security backlog, 5 proofs outstanding |
| Lint | OPEN — 39 errors / 865 warnings, all pre-existing |
| `PRE-TS-001` | ROOT-CAUSE INVESTIGATION — see [`PRE-TS-001-ROOT-CAUSE.md`](./PRE-TS-001-ROOT-CAUSE.md) |
