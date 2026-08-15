# Nazra — UX-4 Enterprise Readiness Program (Execution Contract)

Closes Enterprise risk before feature work resumes. A phase is complete only when it has reproducible **Evidence** — not when the ADR or code is written.

## Locked decisions

- Modular Monolith. No microservices, Kubernetes, multi-region, or system-wide CQRS/Event Sourcing.
- Every consequential boundary declares: Contract, Invariant, Authority, Scope, Evidence, Failure, Recovery.
- Feature freeze: no new consequential Finance / Inventory / Sync features until G3 passes. Allowed: bug fixes, security fixes, required migrations, UX-4 work, test infrastructure, architecture remediation.
- No permanent exceptions — every waiver has an owner and an expiry.

## Phase −1 — Close Sprint 3.1 Batch B (entry condition for UX-4)

UX-4 does not start on an unfinished migration. Batch B is not treated as complete without evidence.

- Finish residual `pages → repositories` remediation via the existing/at most two new grouped query facades (`documents`, `finance`), scope frozen to presentation code.
- Target: residual page→repository violations ≤ 13, critical total ≤ 155, UI cycles stay 0.
- Publish a unified Progress Log: files touched, before/after violations, tests, fitness results, gaps, risks, next step.
- Re-run and record the full evidence set: `tsgo`, build, lint, vitest, architecture fitness, layer violations, cycle analysis — the historical 1187/1187 is not accepted as current evidence.
- Re-measure the architecture baseline and re-seal the fingerprint before any UX-4 work begins.

## Gate 0 — Evidence Integrity (runs before every gate)

Verifies the evidence itself is current: baseline fingerprint, source revision, migration status, test snapshot, fitness snapshot, ADR state, unresolved P0 findings. A stale artifact fails G0 and blocks all downstream gates.

Baseline fingerprint content (`BASELINE-UX4-00x`): git commit, schema migration version, test count, fitness results, architecture violation counts, ADR state, build hash, dependency lock hash.


## Phase 0 — Boundary Catalog (first deliverable, no business code)

`docs/architecture/BOUNDARY_CATALOG.md` as an operational table. Every boundary row carries all 16 required fields: Boundary ID, Name, Owner, Contract, Invariant, Authority, Scope, Evidence, Failure, Recovery, Current RAG, Violations, Test Coverage, Fitness Check, ADR, Exit Criteria.

The 8 boundaries: UI→Application, Application→Domain, Domain→Repository, Repository→DB, Tenant→Data, User→Permission, Offline→Server, Event→Consumer. Each invariant must be expressible as `Invariant → Fitness Rule → Automated Test → CI Evidence`.

Also: ADR-0031 Enterprise Boundary Contract (P0), ADR-0044 Modular Monolith Strategy with explicit service-extraction exit conditions (P1). Seal `BASELINE-UX4-001`.

## Phase 1 — Tenant Isolation & Authority (P0)

- ADR-0032 Tenant Isolation Model — tenant identity traced through UI → tenant context → query cache → repository → RPC/edge function → storage → RLS, plus background jobs and audit identity.
- ADR-0033 Authorization & Policy Decision Architecture.
- `PolicyDecisionPoint` is decision **orchestration only** — never a god object. Domain policy modules (finance, inventory, admin, HR) register with it and own their rules.
- Rich decision result, so audit can be produced from it:

```text
allow: { effect, policyId, policyVersion, reason? }
deny:  { effect, policyId, policyVersion, reason, code }
```

- Route every consequential command (post, approve, pay, void, delete, export, bulk) through the PDP; server-side re-check remains authoritative.
- Tenant-scoped cache-key contract; keys never keyed on userId/recordId alone.
- Evidence: real cross-tenant isolation suite per execution path, replacing the assertion-shaped `tenant-isolation.test.ts`. Seal `BASELINE-UX4-002`.

## Phase 2 — Reliability & Evidence (P0, implemented as one command pipeline)

ADR-0034 Idempotency, ADR-0035 Failure Taxonomy, ADR-0036 Audit, ADR-0037 Observability ship together because they compose a single path:

```text
Command → Authorization → Idempotency → Transaction → Result → Audit → Failure/Recovery
```

- Idempotency extended from `operation_idempotency` / `_shared/idempotency.ts` to all payments, postings, stock movements, sync operations, webhooks.
- `UnknownOutcome` is a **state**, not an error class: `Pending → Submitted → UnknownOutcome → {Confirmed | Rejected | ReconciliationRequired}`, with an explicit reconciliation path. Blind retry is forbidden.
- Audit is evidence, not a logger: actor, tenant, action, entity, before, after, authority, policy + version, correlation, command, operation, **origin** (web / mobile / offline / background / integration), result, timestamp. Immutable.
- Correlation IDs propagated UI → edge → DB via `buildRequestHeaders`, with a redaction rule for sensitive fields. Seal `BASELINE-UX4-003`.

## Phase 3 — Operations (P0 then P1)

- ADR-0039 Offline Sync Consistency (P0), driven by a tested Failure Matrix: device offline → Queued; duplicate op → Deduplicated; app killed → Recoverable; network timeout → Unknown; server rejects → Failed; conflict → Conflict; partial batch → Resume; corrupted local data → Recovery; logout → Secure cleanup; tenant switch → Isolation.
- ADR-0040 Backup/Restore/DR (P0) — an executed restore drill proving backup → restore → integrity → RLS → tenant isolation → financial transactions → inventory → audit → application works, recording achieved RPO and RTO.
- ADR-0042 Security Threat Model & Trust Boundaries (P0).
- ADR-0038 SLO/SLI & Error Budget, ADR-0041 Capacity Model, ADR-0043 External Integration Contract (P1). Seal `BASELINE-UX4-004`.

## Phase 4 — Production Certification

`docs/governance/PRODUCTION_GATES.md`. Each gate follows `Control → Implementation → Automated Test → Fitness Check → CI → Evidence → Gate`, preceded by G0.

G1 Architecture · G2 Security · G3 Data Integrity · G4 Reliability · G5 Performance · G6 Operations · G7 Commercial. Feature development unfreezes only after the affected area is certified.

## Fitness checks delivered by UX-4

`check-layer-boundaries`, `check-ui-supabase`, `check-tenant-scoped-cache`, `check-pdp-coverage`, `check-consequential-audit`, `check-idempotency-coverage`, `check-correlation-propagation`, `check-no-service-role-client`, `check-financial-invariants`, `check-posted-invoice-immutability`, `check-architecture-contracts`.

Each check documents Rule, Detection method, False-positive strategy, Evidence output, Exit condition — no weak grep scripts. Lifecycle: report-only → backlog → remediation → zero or accepted exceptions → blocking.

`docs/governance/EXCEPTION_REGISTER.md` records every accepted violation: ID, Rule, File/Boundary, Reason, Risk, Owner, Expiry, ADR, Approval.

## Immediate deliverable

Phase −1 first: complete Sprint 3.1 Batch B, publish the Progress Log, re-run the full evidence set, and re-seal the architecture baseline.

Then Phase 0 only: `BOUNDARY_CATALOG.md` + ADR-0031 + ADR-0044 + `BASELINE-UX4-001`, with zero business-code changes. Phase 1 (Security / Tenant Hardening) starts only after that baseline is sealed.

## Gap register mapping

G-001→ADR-0031 (Phase 0), G-002/G-003→Phase 1, G-004/G-005/G-006→Phase 2, G-007/G-008/G-009→Phase 3, G-010..G-014→Phase 3 (P1) and Phase 4. ADR approved ≠ implementation complete ≠ evidence certified; the register tracks all three states separately.
