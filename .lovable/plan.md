# Wave 1 — Preflight + Sprint 3.1 Batch B (Controlled Execution)

Wave 0 is closed as IMPLEMENTED / PENDING with evidence `CODEBASE-INVENTORY-001` (snapshot `SNAPSHOT-20260825-001`, commit `2ef870b`). This plan executes Wave 1 exactly as the Master Execution Contract defines it: two separate change units, never bundled.

Approving this plan records **REVIEW-001 = Decision A (proceed)** and seals `BASELINE-NAZRA-001`.

---

## Unit 1 — Preflight: PRE-TS-001 (isolated micro-fix)

Scope: `src/integrations/supabase/previewAuthStorage.ts` only.

The file is auto-generated and the two failing lines (`setItem`, `removeItem`) are inferred-return-type errors (TS7011) caused by the strict audit tsconfig. Because platform rules forbid editing auto-generated Supabase files, the fix will not be applied inside that file. Instead:

1. Classify PRE-TS-001 formally: **non-trivial by policy** (protected auto-generated file), not by complexity.
2. Apply the bounded, zero-behavior remedy outside the file: exclude the auto-generated Supabase integration files from the strict audit typecheck config (they are already excluded from app behavior concerns), leaving app-owned code fully strict.
3. Record the outcome in `PRE_EXISTING_ISSUES.md` (status: RESOLVED-BY-EXCLUSION, with rationale) and append a Preflight record to `PROGRESS_LOG.md`.
4. Own evidence set: typecheck before/after, build, tests. No other file touched.

If the exclusion turns out to weaken any check that covers app-owned code, the unit stops and the issue stays Open/Deferred — no workaround inside the generated file.

---

## Unit 2 — Sprint 3.1 Batch B

Objective: reduce residual `pages → repositories` coupling.

| Metric | Observed (Wave 0) | Target |
|---|---|---|
| `pages → repositories` | 27 | ≤ 13 |
| Critical layer violations | 171 | ≤ 155 |
| UI cycles | 0 | 0 |
| Max FanOut | 59 | no regression |

### Protocol (contract-mandated)

- **PHASE A — Audit, no writes.** Enumerate all 27 residual violations; classify every row: facade redirect / defer / out of scope.
- **PHASE B — Plan.** Present the execution table for human review. Stop before any edit.
- **PHASE C — Execute** only approved rows.
- **PHASE D — Verify** with a fresh full evidence run.
- **PHASE E — Report** with before/after and a Gate Proposal.

### Reuse first

Existing facades are used before anything new is created:

```text
@/application/queries/customers
@/application/queries/suppliers
@/application/queries/products
@/application/queries/customer-search
```

A new facade is created only where the audit proves ≥ 2 consumers. Single-consumer repositories go to the decisions ledger, not into a low-reuse facade.

### Prohibited in this wave

Business logic changes, hooks-as-facades, writes under `src/kernel` / `src/platform` / `src/domain` / `src/infrastructure`, any SQL / RLS / migration / edge-function change, ADR edits, new fitness checks, formatting sweeps, dependency changes.

---

## Evidence (fresh, this commit)

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

## Deliverables

- `docs/architecture/WAVE1_SPRINT3_BATCHB.md` — execution record
- `docs/architecture/WAVE1_SPRINT3_BATCHB_DECISIONS.md` — row-by-row ledger
- `scripts/audits/output/wave1-sprint3-batchB.json` — full evidence-lineage block
- Updated `PROGRESS_LOG.md`, `SCOREBOARD.md`, `PRE_EXISTING_ISSUES.md`

## Closing

Wave 1 closes with a **Gate Proposal only**. No self-certification. `BASELINE-NAZRA-002` advances only after your explicit approval.

## Stop conditions

Any unexpected behavior change, any Class D change surfacing mid-batch, or any target unreachable within the frozen scope → Stop Report, no partial improvisation.
