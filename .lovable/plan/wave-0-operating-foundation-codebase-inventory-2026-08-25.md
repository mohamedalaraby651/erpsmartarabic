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
  - `publicSurfaces[]` — exports per barrel (`src/ui`, `src/kernel`, `src/application/queries`, `src/domain/finance`, …) with **observed size vs observed budget**. An exceeded budget is an observation, not a declared architecture violation; that decision belongs to Governance.
  - `hotspots[]` — top FanIn/FanOut modules, cycles, critical violations grouped by source layer.
  - `backend[]` — tables, RPCs, edge functions with `discoverySource: "repository-files"` on every entry. The section is labelled **repository-observed backend surface**, never presented as the complete live backend.
  - `evidence` — the full lineage block from section 2.
- `docs/architecture/CODEBASE_INVENTORY.md` — human-readable summary rendered from the same JSON.

**Generation vs health.** Inventory generation and codebase health are reported separately. A pre-existing TypeScript, lint, or test failure does not block Wave 0 and does not change its scope; it is recorded as `Codebase TypeScript Health: KNOWN FAILURE` while `Inventory: GENERATED`. Only a failure that actually prevents generating the inventory blocks the wave.

## 4. Pre-existing issues register

Recorded, not fixed:

```text
PRE-TS-001
File: src/integrations/supabase/previewAuthStorage.ts (81, 85)
Detail: setItem / removeItem lack explicit return-type annotations (TS7011)
Severity: Known / Pre-existing
Status: Open
Scope: Outside Wave 0
Classification: deferred — assigned in Wave 1 Preflight, never inside Batch B
```

No application code is touched in Wave 0, this error included.

## 5. Wave 1 prompt (written, not executed)

`docs/governance/WAVE1_BATCHB_PROMPT.md` — naming unified on **WAVE1**, split into two separate change units:

**Wave 1 — Preflight (Class A candidate, separate unit)**
- Classify PRE-TS-001 first. If confirmed trivial: one isolated micro-fix with its own before/after, typecheck/build/test evidence, bounded diff, no behavior change, no architectural impact. If not trivial: defer, no fix.
- Batch B starts only from the resulting clean checkpoint. **No Batch B remediation may be bundled with PRE-TS-001**, and no unrelated cleanup rides along with either unit.
- Rule: one scope → one intent → one evidence set → one decision.

**Wave 1 — Sprint 3.1 Batch B (scope-frozen)**
- Deliverables: `docs/architecture/WAVE1_SPRINT3_BATCHB.md`, `WAVE1_SPRINT3_BATCHB_DECISIONS.md`, `scripts/audits/output/wave1-sprint3-batchB.json`. The `WAVE2_*` naming is retired for this stage.
- Objective: residual presentation `pages/components → repositories` violations ≤ 13, critical total ≤ 155, UI cycles 0, no FanOut regression.
- Reuse existing `customers`, `suppliers`, `products`, `customer-search` facades; new facades only on a proven ≥2-consumer need.
- Prohibited: business logic, hooks-as-facades, writes under `src/kernel|platform|domain|infrastructure`, any SQL/RLS/migration/edge-function change, and any file outside the presentation remediation scope.
- Evidence re-run required (`tsgo`, build, lint, vitest, fitness run-all, dep-graph before/after, cycles); historical results not accepted. No self-certification.

## 6. Review Point (gate inside Wave 0, before Wave 1)

Compare observed inventory numbers against the Sprint 3.1 assumptions and record a decision record in `PROGRESS_LOG.md`:

```text
REVIEW-001
Decision ID / Reviewer / Date
Baseline: BASELINE-NAZRA-001
Inventory Snapshot: SNAPSHOT-YYYYMMDD-NNN
Observed: pages → repositories = N · critical = N · UI cycles = N
Decision: A | B | C
Rationale: …
Approved Next Wave: …
```

- **A** — numbers match → proceed to Batch B as written.
- **B** — numbers differ but remain inside Batch B scope → update the Batch B plan, then proceed.
- **C** — numbers reveal a larger architectural problem → STOP, re-scope, do not execute Batch B.

## Baseline chain (no more full re-analysis after this wave)

Wave 0 is the last stage that establishes the project picture without touching code. Every later wave works from Baseline + Delta + Evidence:

```text
BASELINE-NAZRA-001 → Wave 1 → BASELINE-NAZRA-002 → Phase 0 → BASELINE-UX4-001 → Phase 1 → BASELINE-UX4-002
```

Full re-analysis may be triggered ONLY by: (1) a major architecture strategy change, (2) database/schema restructuring, (3) a new consequential domain, (4) a major authentication/tenant model change, (5) a large-scale migration invalidating dependency evidence, (6) baseline corruption or evidence-integrity failure, (7) an explicit Governance decision. Otherwise: Baseline + Delta + Evidence only.

## Allowed / prohibited in Wave 0

Allowed: Master Contract, governance scaffolds, read-only inventory generator, inventory JSON + markdown, baseline/snapshot/evidence records, pre-existing issue register, Wave 1 prompt, Gate Proposal.

Prohibited: fixing the TypeScript error, editing any React/TSX, repositories, hooks, domain, Supabase, RLS, SQL, migrations or edge functions, creating fitness checks, editing ADRs, executing Batch B, any restructuring.

## Closing state of Wave 0

```text
Implementation: VERIFIED
Inventory: GENERATED
Evidence: AVAILABLE
Certification: NOT CERTIFIED
Gate Proposal: READY FOR REVIEW
```

Wave 1 starts only after the Review Point decision is approved.

