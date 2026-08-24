# Wave 0 — Operating Foundation + Codebase Inventory

Governance and inventory only. Zero business-code, runtime, DB, RLS, ADR, or fitness-check changes. Remediation (Wave 1 — Sprint 3.1 Batch B) does not start in this wave.

```text
Wave 0 (Contract + Inventory) → Review Point → Wave 1 Batch B → G0 → Phase 0 → BASELINE-UX4-001 → Trust / Product / Commercial
```

## 1. `docs/governance/MASTER_EXECUTION_CONTRACT.md` (v1.0, LOCKED)

The full operating contract: role and prohibitions, governing architecture, strangler migration, the three states (Implemented / Verified / Certified), change classification A–D, architecture proportionality, risk budget, smart freeze, the 8 enterprise boundaries, tenant isolation, authorization/PDP, consequential commands, command pipeline, idempotency, UnknownOutcome as a state, audit-as-evidence, correlation, financial invariants, offline failure matrix, fitness-check lifecycle, evidence rules, baseline integrity, material change, domain certification and unfreeze, exception governance, backlog model, execution protocol A–J, scope control, stop conditions, stop report, progress log, scoreboard, per-batch response format, priority ordering.

Two rules added explicitly per this review:

- **Inventory observes; Governance decides.** The inventory states what exists, what connects to what, what is exposed, where the hotspots are, and what violations are observed. It never states that an architecture is acceptable, that a domain is certified, or that a gate passed.
- **Inventory ≠ Fitness Check.** Inventory and audit tooling are observational. No new architectural fitness check is created in this wave.

Scaffolds, structured so later waves append rather than invent:
- `docs/governance/PROGRESS_LOG.md` — append-only; opens with the Wave 0 record (Status: IMPLEMENTED · Verification: PENDING · Certification: NOT CERTIFIED).
- `docs/governance/SCOREBOARD.md` — Product Completion, Architecture Health, P0 Risk Closure, Certified Domains (n/7), Commercial Readiness.
- `docs/governance/EXCEPTION_REGISTER.md` — ID, Rule, File/Boundary, Reason, Risk, Owner, Expiry, ADR, Approval.
- `docs/governance/STOP_REPORT_TEMPLATE.md`.

## 2. Evidence & lineage model (extended)

Every artifact carries: Evidence ID, Snapshot ID, Baseline ID, Parent Baseline, Git Commit, Generated At, Environment, Command, Result, Artifact Hash, Owner, Validity — plus, for generated reports: **Source Artifacts**, **Generator Version**, **Schema Version**, Dependency Lock Hash, Build Hash.

```text
BASELINE-NAZRA-001 / SNAPSHOT-YYYYMMDD-NNN / COMMIT abc123
CODEBASE-INVENTORY-001 ← commit X ← generator vY ← source artifacts A/B/C/D ← hash Z
```

## 3. Codebase inventory (read-only observation tool)

`scripts/audits/codebase-inventory.mjs` — deterministic, read-only, composing the existing audit JSON (`dependency-report.json`, `component-report.json`, `route-report.json`, `data-access-report.json`, `snapshot-report.json`) plus a fresh static pass. Not wired into any gate.

Outputs:
- `scripts/audits/output/codebase-inventory.json`
  - `modules[]` — path, layer (kernel / platform / domain / application / infrastructure / ui / components / pages / lib / hooks / scripts), file count, LOC, public exports.
  - `layers[]` — file counts, inbound/outbound edges, violations observed against `DEPENDENCY_RULES.md`.
  - `publicSurfaces[]` — exports per barrel (`src/ui`, `src/kernel`, `src/application/queries`, `src/domain/finance`, …) with observed budget status.
  - `hotspots[]` — top FanIn/FanOut modules, cycles, critical violations grouped by source layer.
  - `backend[]` — tables, RPCs, edge functions (names only, from repo files).
  - `evidence` — the full lineage block from section 2.
- `docs/architecture/CODEBASE_INVENTORY.md` — human-readable summary rendered from the same JSON.

## 4. Wave 1 prompt (written, not executed)

`docs/governance/WAVE1_BATCHB_PROMPT.md` — Sprint 3.1 Batch B, scope-frozen, naming unified on **WAVE1**:
- Deliverable names: `docs/architecture/WAVE1_SPRINT3_BATCHB.md`, `WAVE1_SPRINT3_BATCHB_DECISIONS.md`, `scripts/audits/output/wave1-sprint3-batchB.json`. The `WAVE2_*` naming is retired for this stage; one stage, one name.
- Objective: residual presentation `pages/components → repositories` violations ≤ 13, critical total ≤ 155, UI cycles 0, no FanOut regression.
- Reuse existing `customers`, `suppliers`, `products`, `customer-search` facades; new facades only on a proven ≥2-consumer need.
- Prohibited: business logic, hooks-as-facades, writes under `src/kernel|platform|domain|infrastructure`, any SQL/RLS/migration/edge-function change.
- Evidence re-run required (`tsgo`, build, lint, vitest, fitness run-all, dep-graph before/after, cycles); historical results not accepted. No self-certification.

## 5. Review Point (gate inside Wave 0, before Wave 1)

Compare observed inventory numbers against the Sprint 3.1 assumptions and choose one:
- **A** — numbers match → proceed to Batch B as written.
- **B** — numbers differ but remain inside Batch B scope → update the Batch B plan, then proceed.
- **C** — numbers reveal a larger architectural problem → STOP, re-scope, do not execute Batch B.

## Exit criteria for Wave 0

Contract + 4 scaffolds + generator + `codebase-inventory.json` + `CODEBASE_INVENTORY.md` exist; business code changes 0, runtime changes 0, DB/RLS changes 0, ADR changes 0, fitness changes 0; inventory generated with hash, commit, snapshot ID and source artifacts linked; Progress Log updated. Certification is not claimed — Wave 0 closes with a Gate Proposal for human approval.

## Note

There is a pre-existing TypeScript error in `src/integrations/supabase/previewAuthStorage.ts` (lines 81 / 85 — the `setItem` / `removeItem` arrow functions need explicit `Promise<void>` return types). It is unrelated to this wave and cannot be edited in plan mode; it will be fixed as the first Class A step once execution starts.
