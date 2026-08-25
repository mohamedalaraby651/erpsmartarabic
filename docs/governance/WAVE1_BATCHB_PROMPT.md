# Wave 1 — Execution Prompt (Preflight + Sprint 3.1 Batch B)

**Status:** WRITTEN, NOT EXECUTED. Wave 1 starts only after REVIEW-001 is recorded with decision A or B.

Naming for this stage is unified on **WAVE1**. The `WAVE2_*` naming is retired for Batch B; one stage, one name.

---

## Unit 1 — Wave 1 Preflight (separate change unit)

Scope: **PRE-TS-001 only**.

1. Classify PRE-TS-001 (`src/integrations/supabase/previewAuthStorage.ts`, lines 81 / 85, TS7011).
2. If confirmed trivial (pure return-type annotation, zero behavior change, zero architectural impact): apply one isolated micro-fix.
   - Bounded diff — only the two annotations.
   - Own evidence: before/after typecheck, build, tests.
   - No refactoring, no formatting sweeps, no adjacent cleanup.
3. If not confirmed trivial: defer, record the reason, do not fix.
4. Record the outcome in `PROGRESS_LOG.md` and update `PRE_EXISTING_ISSUES.md`.

**Hard rule:** No Batch B remediation may be bundled with PRE-TS-001. Batch B starts from the clean checkpoint this unit produces.

```text
One scope → one intent → one evidence set → one decision
```

---

## Unit 2 — Wave 1 · Sprint 3.1 Batch B (scope-frozen)

### Objective

Reduce residual presentation → repository coupling.

| Metric | Current (observed, Wave 0 inventory) | Target |
|---|---|---|
| `pages → repositories` | 27 | ≤ 13 |
| Critical layer violations (total) | 171 | ≤ 155 |
| UI cycles | 0 | 0 |
| Max FanOut | 59 | no regression |

### Protocol

- **PHASE A — Audit, no writes.** Enumerate every residual `pages → repositories` violation and classify each row: facade redirect / defer / out of scope.
- **PHASE B — Plan.** Present the execution table. **Stop here for human review.** No file is edited before approval.
- **PHASE C — Execute** exactly the approved rows.
- **PHASE D — Verify** with a full fresh evidence run.
- **PHASE E — Report** with before/after and a Gate Proposal.

### Reuse first

Use the existing facades before creating anything:

```text
@/application/queries/customers
@/application/queries/suppliers
@/application/queries/products
@/application/queries/customer-search
```

A new facade (e.g. `documents`, `finance`) is created only when the audit proves a genuine ≥ 2-consumer need. Single-consumer repositories are deferred to the decisions ledger, not wrapped in a low-reuse facade.

### Prohibited

- Business logic changes of any kind
- Hooks used as facades
- Writes under `src/kernel`, `src/platform`, `src/domain`, `src/infrastructure`
- Any SQL, RLS, migration, or edge-function change
- Any file outside the presentation remediation scope
- Unrelated cleanup, formatting sweeps, dependency changes
- Creating fitness checks or editing ADRs

### Evidence (fresh, this commit — historical results are not accepted)

```text
tsgo
build
lint
vitest
node scripts/fitness/run-all.mjs
node scripts/audits/dep-graph.mjs        (before + after)
cycle analysis                            (before + after)
node scripts/audits/codebase-inventory.mjs
```

### Deliverables

- `docs/architecture/WAVE1_SPRINT3_BATCHB.md` — execution record
- `docs/architecture/WAVE1_SPRINT3_BATCHB_DECISIONS.md` — row-by-row ledger
- `scripts/audits/output/wave1-sprint3-batchB.json` — with the full evidence-freshness block (Evidence ID, Snapshot ID, Baseline ID, Parent Baseline, Git Commit, Generated At, Environment, Command, Result, Artifact Hash, Owner, Source Artifacts, Generator Version, Schema Version)
- Updated `PROGRESS_LOG.md` and `SCOREBOARD.md`

### Stop conditions

Stop and file a Stop Report on: any unexpected architectural or business-behavior change, any Class D change surfacing mid-batch, or any target unreachable within the frozen scope.

### Closing

Close with a Gate Proposal. **No self-certification.** The baseline advances to `BASELINE-NAZRA-002` only after human approval.
