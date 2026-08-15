# Nazra — Enterprise Readiness Program (UX-4)

Closes the Enterprise Gaps identified in the Architecture Due Diligence before any new feature work. Feature freeze applies to consequential modules (finance, inventory, sync) until Gate 3 passes.

## Guiding decisions (locked)

- Modular Monolith. No microservices, no Kubernetes, no multi-region, no full CQRS/Event Sourcing beyond the existing Invoice aggregate.
- Every consequential boundary must declare: Contract, Invariant, Authority, Scope, Evidence, Failure, Recovery.
- Rules become machine-checkable fitness checks in CI, not documentation only.

## Phase 0 — Boundary Catalog (documentation, no code)

- `docs/architecture/BOUNDARY_CATALOG.md` — the 8 boundaries from the analysis with the 7 attributes each and current RAG status.
- ADR-0031 Enterprise Boundary Contract (P0).
- ADR-0044 Modular Monolith Strategy (P1) — declares the no-service-extraction rule and its exit conditions.

## Phase 1 — Isolation & Authority (P0)

ADRs first, then implementation + tests.

- ADR-0032 Tenant Isolation Model — tenant identity flow through UI, query cache keys, repositories, RLS, offline store, background jobs, audit.
- ADR-0033 Authorization & Policy Decision Architecture — a single Policy Decision Point: identity + tenant + role + permission + resource + resource state + action + context.
- Implementation:
  - `src/platform/security/PolicyDecisionPoint.ts` with a typed `decide(request): Allow | Deny(reason)`.
  - Route every consequential command (post, approve, pay, void, delete, export, bulk) through the PDP; server-side re-check stays authoritative.
  - Tenant-scoped React Query cache key contract + fitness check `check-tenant-scoped-cache.mjs`.
- Evidence: automated cross-tenant isolation test suite per execution path (query facade, repository, RPC, storage, edge function) replacing the current assertion-shaped `tenant-isolation.test.ts`.

## Phase 2 — Evidence & Determinism (P0)

- ADR-0034 Idempotent Command Execution — extends the existing `operation_idempotency` table and `_shared/idempotency.ts` to all payments, postings, stock movements, sync operations, webhooks.
- ADR-0035 Failure Taxonomy & Recovery Semantics — generalizes `RepositoryFailure`, adding `UnknownOutcome` (timeout after submit) with a reconciliation path.
- ADR-0036 Unified Audit Evidence Model — who / what / when / tenant / origin / before / after / authority / policy / correlation / result; immutable log; a fitness check that no consequential command path lacks audit emission.
- ADR-0037 Observability & Correlation Model — `correlation_id` propagated UI → edge → DB across all invocations via the existing `buildRequestHeaders` helper, plus a redaction rule for sensitive fields.

## Phase 3 — Operations & Proof (P0/P1)

- ADR-0039 Offline Sync Consistency Model (P0) — ordering, dedup, conflict policy, partial sync, crash recovery.
- ADR-0040 Backup, Restore & Disaster Recovery (P0) — RPO/RTO targets plus a documented and executed restore drill with integrity, RLS, tenant and business-transaction verification.
- ADR-0042 Security Threat Model & Trust Boundaries (P0) — assets, actors, trust boundaries, threats, controls, residual risks.
- ADR-0038 SLO/SLI & Error Budget (P1), ADR-0041 Capacity Model (P1), ADR-0043 External Integration Contract (P1).

## Phase 4 — Production Gates

`docs/governance/PRODUCTION_GATES.md` defines the 7 gates and their blocking criteria; each gate gets a CI workflow that must be green:

1. Architecture — zero critical violations, zero UI→Supabase, fitness green.
2. Security — tenant isolation, PDP coverage, RLS tests, no secrets in bundle.
3. Data Integrity — debit=credit, posted-invoice immutability, no duplicate payment, no orphan transaction, balanced stock movement.
4. Reliability — failure-injection suite (timeout, duplicate, partial failure, sync interruption, unknown outcome) proving a safe recoverable state.
5. Performance — P95/P99 budgets and a load test.
6. Operations — runbooks, alerts, restore drill evidence.
7. Commercial — pricing/tenant provisioning readiness.

## Technical notes

- ADR numbering: 0031–0044 as specified; duplicate `0028` stays as-is (historical), no renumbering.
- New fitness checks land in `scripts/fitness/` and register in `run-all.mjs`; each starts report-only, then becomes blocking once the backlog is cleared.
- Database work (audit columns, idempotency extension, immutability triggers) ships as separate migrations with GRANTs and RLS per project standard.
- Baseline fingerprint re-sealed at the end of each phase (`BASELINE-UX4-00x`).

## Sequencing

Phase 0 is small and unblocks everything. Recommended execution order: Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4, one wave per approval, each wave sealed with evidence before the next starts.
