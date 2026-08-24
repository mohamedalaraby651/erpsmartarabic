# Nazra 2.0 — Execution Contract (Locked Strategy, Adaptive Batches)

Operating model: Product delivery, architecture evolution, and enterprise trust run in parallel under risk-based gates. Strategy is locked; execution stays evidence-driven, one wave at a time. No mass build-out of ADRs, fitness checks, or gates up front.

## Locked foundation sequence (no parallelization before it completes)

```text
G0 Evidence Integrity → Sprint 3.1 Batch B → Phase 0 Boundary Model → BASELINE-UX4-001 → Parallel Tracks
```

Parallel work before Batch B and the Boundary Model would build on a moving baseline.

## Change Classification Gate (applies before any change)

| Class | Examples | Required controls |
|---|---|---|
| A — Trivial | copy, spacing, cosmetic UI | none |
| B — Low | presentation component, report formatting, dashboard visuals | test where applicable + regression |
| C — Medium | contract-visible behavior, non-consequential workflow | contract + tests + evidence |
| D — High | ledger posting, payments, stock movement, sync semantics, tenant authority, permission model, RLS, migrations | ADR + contract + invariant + authority + failure + recovery + fitness + automated tests + evidence + gate |

Governance weight scales with consequence — no ADR ceremony on Class A/B work.

## Authority rule

**Lovable may implement, verify, and report. Lovable may not self-certify.**

```text
Implementation → Tests → Evidence → Gate Proposal → Human approval → Certified
```

## Smart freeze

Frozen until the owning domain is certified: ledger posting, payment execution, stock movement, sync semantics, tenant authority, permission model.

Always allowed (must not break an existing contract or invariant): UI improvements, reporting presentation, dashboard/search UX, accessibility, documentation, onboarding, non-consequential workflow, commercial preparation.

## Domain Certification (profile-based)

Certification is per domain with a **Domain Certification Profile** — uniform in principle, domain-specific in requirements. Example: Finance requires Financial Integrity and Idempotency as REQUIRED; Reporting marks Idempotency N/A where genuinely non-command, requires Data Correctness, and requires Audit for exports.

Each domain record carries: Certified At, Baseline, Certified Commit, Dependencies, Material Changes, Re-certification Trigger.

**Certification is not permanent.** A material change to RLS, auth, tenant, finance, repositories, sync, idempotency, audit, PDP, DB migrations, or edge functions moves the domain to `REVIEW REQUIRED`. A future `scripts/governance/check-material-change.mjs` detects this from the diff — tests passing is not sufficient to keep certification.

Certifying a domain triggers its **Domain Unfreeze Gate**: consequential features in that domain reopen without waiting for the rest of the system.

## Evidence Freshness

Every evidence artifact records: Evidence ID, Generated At, Git Commit, Environment, Command, Result, Artifact Hash, Owner, Expiry/Validity. G0 fails on stale or commit-mismatched evidence, blocking all downstream gates.

## Tracks (open only after BASELINE-UX4-001)

- **Trust Track** — Phase 1 Tenant Isolation (ADR-0032) + Authorization/PDP (ADR-0033, orchestration only, decision carries `effect, policyId, policyVersion, reason, code`); Phase 2 the command pipeline `Command → Authorization → Idempotency → Transaction → Result → Audit → Failure/Recovery` (ADR-0034/0035/0036/0037, with `UnknownOutcome` as a state: `Pending → Submitted → UnknownOutcome → {Confirmed | Rejected | ReconciliationRequired}`); Phase 3 Offline consistency (ADR-0039), DR drill with achieved RPO/RTO (ADR-0040), Threat model (ADR-0042), then P1 ADR-0038/0041/0043.
- **Product Track** — Class A–C work only.
- **Commercial Track** — pricing, packaging, onboarding, demo, docs, pilot prep.

Backlogs: Risk (P0/P1), Product, Commercial → one sprint plan under a risk budget (high value/low risk → build; high value/high risk → close risk first; low value/high risk → reject; low value/low risk → backlog).

Scoreboard per baseline: Product Completion, Architecture Health, P0 Risk Closure, Certified Domains (n/7), Commercial Readiness.

---

# Wave 1 (this wave only) — Sprint 3.1 Batch B, Controlled Execution

Nothing beyond this wave is built until its evidence exists.

1. **Audit first, no writes.** Enumerate every residual `pages/components → repositories` violation from the dependency graph and classify each (facade redirect / defer / out of scope). Present the execution table before editing any file.
2. **Reuse first.** Use the existing `customers`, `suppliers`, `products`, `customer-search` facades. Create `documents` and/or `finance` facades only if a genuine ≥2-consumer need is proven in the audit.
3. **Scope freeze.** Import redirects in presentation code only. No business logic, no hooks-as-facades, no `src/kernel|platform|domain|infrastructure` writes, no SQL/RLS/migration/edge-function changes.
4. **Targets.** Residual violations 27 → ≤ 13, critical total ≤ 155, UI cycles remain 0, no FanOut regression.
5. **Full evidence suite re-run and recorded:** `tsgo`, build, lint, vitest, `scripts/fitness/run-all.mjs`, `dep-graph.mjs` layer violations, cycle analysis. The historical 1187/1187 is not accepted as current evidence.
6. **Deliverables:** `docs/architecture/WAVE2_SPRINT3_BATCHB.md` (execution record), `WAVE2_SPRINT3_BATCHB_DECISIONS.md` (row-by-row ledger), before/after comparison, `scripts/audits/output/wave2-sprint3-batchB.json` with the evidence-freshness fields.
7. **Halt conditions.** Stop and report on any unexpected architectural or business-behavior change, any Class D change surfacing mid-batch, or any target that cannot be met within the frozen scope.
8. **No self-certification.** Close with a Gate Proposal and Progress Log; certification and the baseline re-seal wait for approval.

## Wave 2 (not started until Wave 1 evidence is reviewed)

G0 → Phase 0: `BOUNDARY_CATALOG.md` (16 fields × 8 boundaries) + ADR-0031 + ADR-0044 → seal `BASELINE-UX4-001`. Trust/Product/Commercial tracks open only after that seal.
