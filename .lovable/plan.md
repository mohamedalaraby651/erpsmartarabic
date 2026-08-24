# Nazra 2.0 — Operating Documents + Codebase Inventory Report

Three deliverables, no business-code changes. This wave writes governance documents and one read-only inventory generator; Batch B remediation itself is a separate, later wave.

## 1. `docs/governance/MASTER_EXECUTION_CONTRACT.md`

The Lovable Master Execution Contract v1.0 (Status: LOCKED), captured verbatim in structure as the project's operating contract — all 35 sections: role and prohibitions, governing architecture, strangler migration, the three states (Implemented / Verified / Certified), change classification A–D, architecture proportionality, risk budget, smart freeze, enterprise boundary contract (8 boundaries), tenant isolation, authorization/PDP, consequential commands, command pipeline, idempotency, UnknownOutcome as a state, audit-as-evidence, correlation, financial invariants, offline failure matrix, fitness-check lifecycle, evidence rules, baseline integrity, material change, domain certification and unfreeze, exception governance, backlog model, the A–J execution protocol, pre-implementation rule, scope control, stop conditions, stop report, progress log, scoreboard, final per-batch response format, and the absolute priority ordering.

Supporting scaffolds created empty-but-structured so later waves append rather than invent:
- `docs/governance/PROGRESS_LOG.md` (append-only, with the required field template)
- `docs/governance/SCOREBOARD.md` (Product Completion, Architecture Health, P0 Risk Closure, Certified Domains, Commercial Readiness)
- `docs/governance/EXCEPTION_REGISTER.md` (ID, Rule, File/Boundary, Reason, Risk, Owner, Expiry, ADR, Approval)
- `docs/governance/STOP_REPORT_TEMPLATE.md`

## 2. `docs/governance/WAVE1_BATCHB_PROMPT.md`

Wave 1 — Sprint 3.1 Batch B execution prompt v1.0, copy-paste ready and scope-frozen:
- Objective: residual presentation `pages/components → repositories` violations down to ≤ 13 (critical total ≤ 155), UI cycles stay 0, no FanOut regression.
- Reuse the existing `customers`, `suppliers`, `products`, `customer-search` facades; create `documents` / `finance` only on a proven ≥2-consumer need.
- Prohibited: business logic, hooks-as-facades, writes under `src/kernel|platform|domain|infrastructure`, any SQL/RLS/migration/edge-function change, unrelated cleanup.
- Protocol A–J with an explicit review stop after PHASE B (plan) and no self-certification at the end.
- Required evidence: `tsgo`, build, lint, vitest, `scripts/fitness/run-all.mjs`, `dep-graph.mjs` before/after, cycle analysis — historical results are not accepted.
- Deliverables named up front: `WAVE2_SPRINT3_BATCHB.md`, `WAVE2_SPRINT3_BATCHB_DECISIONS.md`, `scripts/audits/output/wave2-sprint3-batchB.json` with evidence-freshness fields (Evidence ID, Generated At, Git Commit, Environment, Command, Result, Artifact Hash, Owner, Baseline).

## 3. Machine-readable codebase inventory report

`scripts/audits/codebase-inventory.mjs` — read-only generator, deterministic output, composing the existing audit JSON (`dependency-report.json`, `component-report.json`, `route-report.json`, `data-access-report.json`, `snapshot-report.json`) plus a fresh static pass. Writes:

- `scripts/audits/output/codebase-inventory.json` — the agency-facing artifact:
  - `modules[]`: path, layer (kernel / platform / domain / application / infrastructure / ui / components / pages / lib / hooks / scripts), file count, LOC, public exports.
  - `layers[]`: file counts, inbound/outbound edges, violation counts against `DEPENDENCY_RULES.md`.
  - `publicSurfaces[]`: exports per barrel (`src/ui/index.ts`, `src/kernel/index.ts`, `src/application/queries/index.ts`, `src/domain/finance/index.ts`, …) with the budget status.
  - `hotspots[]`: top FanIn/FanOut modules, cycles, and the critical layer-violation list grouped by source layer.
  - `backend[]`: tables, RPCs, edge functions (names only, from repo files).
  - `evidence`: generatedAt, git commit, artifact hash — same freshness fields as every other artifact.
- `docs/architecture/CODEBASE_INVENTORY.md` — a short human-readable summary rendered from the same JSON, for the agency review.

The generator is added to the audit set and can be run in CI alongside the existing drift report; it changes no application behavior.

## Out of scope for this wave

No Batch B code remediation, no ADRs 0031–0044, no fitness checks, no database work. Those follow their own waves once this contract is in place.
