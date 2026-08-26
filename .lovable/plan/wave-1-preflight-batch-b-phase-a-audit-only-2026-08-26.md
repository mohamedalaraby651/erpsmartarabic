# Wave 1 — Preflight + Batch B Phase A (Audit Only)

Execution authority granted by this plan stops at **Phase B**. No source file is modified for Batch B in this wave.

## Governance corrections applied

**REVIEW-001 is not recorded by approving this plan.** The decision letters are redefined and the decision itself is deferred until the Phase A audit exists:

```text
A = Scope valid — the observed delta is fully remediable inside the frozen Batch B contract
B = Scope valid — plan adjustment required
C = Scope invalid — stop and re-scope
```

`pages → repositories = 27` vs target `≤ 13` is an observation, not a verdict. Only the Phase A decision matrix can prove which letter is defensible.

**Observed ≠ critical.** The inventory reports 171 *observed* layer violations. The critical count is whatever `node scripts/fitness/run-all.mjs` produces under the project's canonical Sprint 3.1 definition, and it is recorded as `TBD` until that run.

| Metric | Value |
|---|---|
| Observed layer violations (inventory) | 171 |
| Critical layer violations (canonical fitness) | TBD — determined in Phase A |
| `pages → repositories` (observed) | 27 |
| UI cycles | 0 |
| Max FanOut | 59 |

**Baseline commit.** Before `BASELINE-NAZRA-001` is sealed, verify the commit actually contains all ten Wave 0 artifacts (contract, progress log, scoreboard, exception register, stop-report template, pre-existing issues, Wave 1 prompt, inventory generator, inventory JSON, inventory markdown). If a later commit holds them, the baseline binds to that final commit, not to `2ef870b`.

---

## Unit 1 — Preflight: PRE-TS-001

Scope: the two TS7011 errors in `src/integrations/supabase/previewAuthStorage.ts`.

1. Classify: the file is auto-generated and platform-protected — **non-trivial by policy**, not by complexity. It is not edited.
2. Evaluate the source of truth: which tsconfig raises TS7011 on it, and whether that config is meant to cover generated integration files at all.
3. If an exclusion is the correct remedy, it must be **narrowly scoped to the named generated files only** — explicitly `src/integrations/supabase/client.ts`, `types.ts`, `previewAuthStorage.ts`. A broad `src/integrations/**` exclusion is prohibited, since that tree also holds application-owned code.
4. Prove no coverage loss: typecheck before/after must show the same error set for every application-owned file. If any app-owned error would be hidden, the unit stops and PRE-TS-001 stays Open/Deferred.
5. Evidence set of its own: typecheck before/after, build, tests, plus `git status --short` and `git diff --name-only`.
6. Record in `PRE_EXISTING_ISSUES.md` and append a Preflight record to `PROGRESS_LOG.md`.

No Batch B work may ride along with this unit.

---

## Unit 2 — Batch B, Phase A only

**Hard rule: no source file is modified during Phase A or Phase B — even when the fix is obvious.**

### Deliverable: decision matrix, one row per violation

| # | File | Repository | Violation | Severity | Existing facade | Consumers | Action | Expected result |
|---|---|---|---|---|---|---|---|---|

`Action` is restricted to exactly this closed set:

```text
REDIRECT_EXISTING_FACADE
CREATE_GROUPED_FACADE
DEFER
OUT_OF_SCOPE
FALSE_POSITIVE
```

`REFACTOR` is not an allowed action. Anything that would need it is `DEFER`.

### New facade rule (tightened)

A `CREATE_GROUPED_FACADE` row requires all four:

- ≥ 2 consumers
- same read concern
- same application/query responsibility
- no business-logic leakage

Consumer count alone is insufficient — `getX()` plus `updateY()` is not a query family. This blocks catch-all `finance.ts` / `documents.ts` buckets.

Existing facades are checked first: `customers`, `suppliers`, `products`, `customer-search`.

### Phase A also determines

- The canonical critical-violation count from `scripts/fitness/run-all.mjs`
- Whether `27 → ≤ 13` is genuinely achievable inside the frozen contract, or whether a larger architectural boundary problem has surfaced
- The exact remediation scope proposal

### Phase B — stop point

Present the matrix and the proposed scope. Then **STOP** for human review. Phase C is out of scope for this wave and must not be started in the same execution.

---

## After human review (not executed now)

On approval, the accepted rows are frozen as **`BATCHB-SCOPE-001`** containing: approved files, approved facade targets, approved new facades, excluded files, expected violation delta. Phase C may then modify only files listed in that scope. A newly discovered similar case is a STOP → decision ledger → human approval, never an opportunistic extra fix.

## Evidence commands

```text
tsgo
build
lint
vitest
node scripts/fitness/run-all.mjs
node scripts/audits/dep-graph.mjs
node scripts/audits/codebase-inventory.mjs
git status --short
git diff --stat
git diff --name-only
```

Scope control test: **changed files == approved files**, nothing more.

## Wave 1 (this stage) deliverables

- `docs/architecture/WAVE1_SPRINT3_BATCHB_PHASEA.md` — the decision matrix and canonical counts
- Updated `PRE_EXISTING_ISSUES.md`, `PROGRESS_LOG.md` (Preflight record + Phase A record)
- `scripts/audits/output/wave1-phaseA.json` — evidence lineage block
- A REVIEW-001 recommendation (A / B / C) with the audit data that justifies it — recommendation only, no self-certification

## Stop conditions

Unexpected behavior change, a Class D change surfacing mid-audit, or the audit showing the target unreachable within the frozen scope → Stop Report, no improvisation.
