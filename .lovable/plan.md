# Nazra 2.0 — Risk-Driven Execution Model

Replaces both "Build then Harden" and "Harden then Build". Product delivery, architecture evolution, and enterprise trust run in parallel under risk-based gates. UX-4 is retained but converted from a stop-the-world phase into the **Enterprise Control Plane** that decides what may ship, what is blocked, and what needs certification.

## Governing rules

- **Three separate states:** Implemented ≠ Verified ≠ Certified. Every work item is tracked in all three.
- **Architecture proportionality:** low consequence → lightweight controls; medium → tests + contract; high → ADR + invariant + fitness + evidence + gate. No ceremony on trivial changes.
- **Risk budget per feature:** high value / low risk → build. High value / high risk → close the risk first. Low value / high risk → reject. Low value / low risk → backlog.
- **Strangler migration continues.** No rewrite.

## Smart freeze (replaces blanket feature freeze)

Frozen until the owning domain is certified: ledger posting, payment execution, stock movement, sync semantics, tenant authority, permission model.

Always allowed (must not break an existing contract or invariant): UI improvements, reporting presentation, dashboard/search UX, accessibility, documentation, onboarding, non-consequential workflow work, commercial preparation.

## Sequenced foundation (real dependencies only)

1. **Gate 0 — Evidence Integrity.** Baseline fingerprint, source revision, migration status, test snapshot, fitness snapshot, ADR state, open P0 findings. Stale evidence blocks every downstream gate.
2. **Sprint 3.1 Batch B — migration close.** Residual `pages → repositories` from 27 → ≤ 13 (critical total ≤ 155, UI cycles 0), via the existing facades plus at most two new grouped ones (`documents`, `finance`). Presentation-scope only. Publish a unified Progress Log and re-run the full evidence set (`tsgo`, build, lint, vitest, fitness, layer violations, cycles) — the historical 1187/1187 is not accepted as current evidence.
3. **Phase 0 — Boundary Model.** `docs/architecture/BOUNDARY_CATALOG.md` with all 16 fields per boundary (ID, Name, Owner, Contract, Invariant, Authority, Scope, Evidence, Failure, Recovery, RAG, Violations, Test Coverage, Fitness Check, ADR, Exit Criteria) for the 8 boundaries; ADR-0031 Enterprise Boundary Contract; ADR-0044 Modular Monolith Strategy. Seal `BASELINE-UX4-001`.

After Phase 0 the plan stops being linear.

## Parallel tracks

**Trust Track (P0 risk closure)**
- Phase 1 — Tenant Isolation (ADR-0032) + Authorization/PDP (ADR-0033). PDP is decision orchestration only; domain policy modules own their rules. Decision result carries `effect, policyId, policyVersion, reason, code` so audit is derivable. Tenant-scoped cache-key contract; real cross-tenant negative tests per execution path.
- Phase 2 — one command pipeline: `Command → Authorization → Idempotency → Transaction → Result → Audit → Failure/Recovery`. ADR-0034 Idempotency, ADR-0035 Failure taxonomy with `UnknownOutcome` as a **state** (`Pending → Submitted → UnknownOutcome → {Confirmed | Rejected | ReconciliationRequired}`), ADR-0036 Audit-as-evidence (incl. `origin`: web/mobile/offline/background/integration), ADR-0037 Correlation.
- Phase 3 — Offline consistency failure matrix (ADR-0039), DR restore drill with achieved RPO/RTO (ADR-0040), Threat model (ADR-0042); then P1: ADR-0038 SLO/SLI, ADR-0041 Capacity, ADR-0043 Integration contracts.

**Product Track** — safe (non-consequential) capability and UX work runs continuously alongside the Trust Track.

**Commercial Track** — pricing, packaging, onboarding, demo, docs, pilot prep; no dependency on Trust Track completion.

## Domain Certification & Controlled Unfreeze

Certification is per domain, not per system. A domain (Finance, Inventory, Sales, Purchasing, HR, Reporting, Platform Admin) is Certified when it has: Architecture ✓ Tenant ✓ Authorization ✓ Integrity ✓ Idempotency ✓ Audit ✓ Reliability ✓ Evidence ✓.

`docs/governance/DOMAIN_CERTIFICATION.md` holds the matrix. Certifying a domain triggers its **Domain Unfreeze Gate** — consequential features in that domain reopen immediately, without waiting for the rest of the system.

## Production Gates

`docs/governance/PRODUCTION_GATES.md`: G0 Evidence Integrity, G1 Architecture, G2 Security, G3 Data Integrity, G4 Reliability, G5 Performance, G6 Operations, G7 Commercial. Each follows `Control → Implementation → Automated Test → Fitness Check → CI → Evidence → Gate`.

## Backlog & KPIs

Three backlogs — Risk (P0/P1), Product, Commercial — feeding one sprint plan under the risk budget.

Project scoreboard (`docs/governance/SCOREBOARD.md`), regenerated with each baseline: Product Completion, Architecture Health, P0 Risk Closure, Certified Domains (n/7), Commercial Readiness.

## Fitness checks delivered

`check-tenant-scoped-cache`, `check-pdp-coverage`, `check-consequential-audit`, `check-idempotency-coverage`, `check-correlation-propagation`, `check-no-service-role-client`, `check-financial-invariants`, `check-posted-invoice-immutability`, `check-architecture-contracts` — added to `scripts/fitness/run-all.mjs`. Each documents Rule, Detection, False-positive strategy, Evidence, Exit condition. Lifecycle: report-only → backlog → remediation → zero/accepted exceptions → blocking.

`docs/governance/EXCEPTION_REGISTER.md`: ID, Rule, File/Boundary, Reason, Risk, Owner, Expiry, ADR, Approval. No permanent exceptions.

## Immediate next step

Execute Sprint 3.1 Batch B, publish the Progress Log, re-run and record the evidence set, re-seal the baseline. Phase 0 follows; the parallel tracks open after `BASELINE-UX4-001` is sealed.
