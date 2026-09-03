# F1-C — Consolidated Verification (VERIFICATION ONLY)

- **Authority:** `F1_SCOPE_001-R2` — hash `e8ec2359fe4521967aba4d46f77711c047eb4bc4a58e3e0b36ea8db4727c7fe8` (read back from the frozen artifact, unchanged).
- **Mode:** VERIFICATION ONLY. No source file was modified, no facade created, no cleanup performed, **PRE-TS-001 containment was not re-applied**.
- **Commit:** `812028cb663cce8203616707c7daf616515ef247` · F1 mutation window `15471476^..HEAD`
- **Baseline:** `BASELINE-UX4-001` · **Snapshot:** `SNAPSHOT-20260825-001`
- **Machine evidence:** `scripts/audits/output/f1-verification.json` (artifact hash `6d47790a6efc385e808ff2e4d8fccf8fa7edbd7ea69d8638e4f514bf2d1cf760`)
- **Verdict:** **PASS** — certification **NOT** claimed.

---

## 1. Scope integrity

| Check | Expected | Observed |
|---|---|---|
| Scope identity | `F1_SCOPE_001-R2` | `F1_SCOPE_001-R2` |
| Scope hash | `e8ec2359…eb0f7fe` | identical, re-read from artifact |
| Authorized items | 37 | **37** (`F1-001` … `F1-037`) |
| F1-A items | 4 | **4** |
| F1-B items | 33 | **33** |
| Approved files / edges | as frozen | identical — no substitution, no addition |

## 2. Edge elimination — 37/37

Every approved edge was proven eliminated by direct source inspection of the scoped consumer: the forbidden specifier is absent **and** the approved application surface is imported.

| Batch | Approved edges | Eliminated | Failed |
|---|---:|---:|---:|
| F1-A (pages → repositories) | 4 | **4** | 0 |
| F1-B (components → repositories) | 33 | **33** | 0 |
| **Total** | **37** | **37** | **0** |

`F1-002` is satisfied by two approved surfaces (`quotations` + `activity-logs`); both are present.

## 3. Metric rule — no false "zero" claim

F1 did **not** drive `components→repositories` to zero, and this record does not claim it.

| Metric | Value |
|---|---:|
| F1-approved **component** → repository edges remaining | **0 / 33** |
| F1-approved **page** → repository edges remaining | **0 / 4** |
| Out-of-scope **component** → repository edges | **8** |
| Out-of-scope **page** → repository edges | **7** |
| Global scanner `components→repositories` | **8** |
| Global scanner `pages→repositories` | **7** |

Scanner totals and the independent source scan agree exactly (8 = 8, 7 = 7), so the residual set is complete, not sampled.

### 3.1 Out-of-scope residual edges (reported, NOT remediated)

**Components (8) — all `mapRepoError` from `@/lib/repositories/_base`:**
`categories/CategoryFormDialog.tsx`, `credit-notes/CreditNoteFormDialog.tsx`, `expenses/ExpenseCategoryFormDialog.tsx`, `expenses/ExpenseFormDialog.tsx`, `quotations/QuotationFormDialog.tsx`, `suppliers/SupplierPaymentDialog.tsx`, `treasury/CashRegisterFormDialog.tsx`, `treasury/CashTransactionDialog.tsx`.

`_base` is an error-mapping utility, not a read surface. Wrapping it in a facade would satisfy the scanner while hiding the actual architectural question. Deferred to a separate decision.

**Pages (7):**

| File | Edge | Nature |
|---|---|---|
| `pages/categories/CategoriesPage.tsx` | `_base` | error-mapping utility |
| `pages/expenses/ExpenseCategoriesPage.tsx` | `_base` | error-mapping utility |
| `pages/expenses/ExpensesPage.tsx` | `_base` | error-mapping utility |
| `pages/accounting/JournalEntriesPage.tsx` | `journalRepository` | type-only import (`JournalRow`) |
| `pages/approvals/ApprovalsPage.tsx` | `approvalRepository` | type-only import |
| `pages/inventory/InventoryPage.tsx` | `inventoryRepository` | type-only import |
| `pages/payments/PaymentsPage.tsx` | `paymentRepository` | type-only import |

None of the 15 residuals belongs to the 37 approved edges. **F1-scoped remaining = 0.**

## 4. Changed-file inventory (F1 window)

63 files changed, classified:

| Class | Count | Content |
|---|---:|---|
| A — approved F1 consumer mutation | 32 | the 4 pages + 28 component/hook consumers carrying the 37 edges |
| B — minimal F1-required facade | 16 | 15 ADR-0028 facades + `src/application/queries/index.ts` barrel |
| C — governance / evidence artifact | 15 | execution records, progress log, audit outputs, `public/version.json` |
| **D — unauthorized** | **0** | — |

Diff nature of class A: `32 files changed, 38 insertions(+), 37 deletions(-)` — a machine filter over the diff found **zero changed lines that are not import statements**. No call site, argument, JSX, or logic line was touched.

## 5. Facade verification (23 inspected)

All 23 facades referenced by the frozen scope (15 created for F1, 8 pre-existing reused) were inspected:

- pure re-export only — **23/23** (single `export * from "@/lib/repositories/…"` line after comments)
- implementation / business logic / validation / transformation / caching / state — **0 occurrences**
- DB or Supabase calls — **0**
- new repository created — **0**
- new query service created — **0**
- provenance target exists as an approved repository capability — **23/23**

## 6. Dependency verification

`node scripts/audits/dep-graph.mjs`

| Metric | Value | vs pre-F1 |
|---|---:|---|
| total modules | 1227 | +15 facades |
| total import layer violations | **118** | 155 → 118 (−37) |
| `pages → repositories` | 7 | 11 → 7 |
| `components → repositories` | 8 | 41 → 8 |
| `components → services` | 5 | unchanged |
| `pages → supabase-client` | 29 | unchanged |
| `components → supabase-client` | 38 | unchanged |
| `hooks → supabase-client` | 31 | unchanged |
| cycles | 6 | unchanged |
| UI cycles | **0** | unchanged |

The −37 delta matches the 37 approved edges exactly. No collateral movement.

## 7. Negative verification

| Area | Result |
|---|---|
| F2 scope (all three supabase-client buckets: 29 / 38 / 31) | **unchanged** |
| BND-05 / RLS / migrations (`supabase/**`) | 0 files changed |
| tenant authority (`src/kernel/tenant/**`) | 0 files changed |
| permissions (`src/kernel/permissions/**`) | 0 files changed |
| finance (`src/{domain,application,infrastructure}/finance/**`) | 0 files changed |
| domain logic (`src/domain/**`) | 0 files changed |
| sync/offline semantics | 0 files changed |
| PRE-EXT-001 | untouched, remains OPEN |

## 8. PRE-TS-001 disclosure

`src/integrations/supabase/previewAuthStorage.ts` was regenerated by the platform during this verification window, reintroducing `TS7011` at lines 81 and 85 — **recurrence #11**.

Per the F1-C mandate this was **reported only and NOT fixed**. `scripts/audits/typecheck-app.mjs` classifies both as platform-owned: `total=2 platform=2 project=0 → PASS`. `RISK-008` remains **OPEN**. This is outside F1 and is not counted for or against the F1 result.

## 9. Quality verification

| Command | Result |
|---|---|
| `node scripts/audits/typecheck-app.mjs` | **PASS** — total 2 / platform 2 (PRE-TS-001) / project **0** |
| `npx tsgo --noEmit -p tsconfig.app.json` | no project-owned diagnostics |
| `npx vite build` | **PASS** — built in 17.89s (pre-existing chunk-size warning only) |
| `npx vitest run` | **PASS** — 1619 passed / 5 skipped (158 files passed, 1 skipped) |
| `node scripts/fitness/run-all.mjs` | **PASS** — 33 active / 9 pending / **0 failures** |
| `node scripts/audits/dep-graph.mjs` | **PASS** — 1227 modules, 6 cycles, 118 violations |
| `node scripts/audits/f1-verification.mjs` | **PASS** — 37/37 edges, 23 facades, 0 unauthorized |

## 10. Failures / warnings

- Failures: **none**.
- Warnings: PRE-TS-001 recurrence #11 (disclosed above); pre-existing bundle chunk-size warning; 9 pending fitness checks (pre-existing, unrelated to F1).

## 11. Reproducibility

```text
node scripts/audits/dep-graph.mjs
node scripts/audits/typecheck-app.mjs
npx vite build
npx vitest run
node scripts/fitness/run-all.mjs
node scripts/audits/f1-verification.mjs   # regenerates f1-verification.json
```

Inputs: `scripts/audits/output/f1-scope-001-r2.json` (frozen), `scripts/audits/output/dependency-report.json`, git history `15471476^..HEAD`. The verification script derives every claim from these; no figure in this document is hand-entered from a prior report.

---

## VERDICT

```text
PASS
```

F1-A + F1-B match `F1_SCOPE_001-R2` exactly: 37/37 approved edges eliminated, 0 unauthorized mutations, 0 behaviour change, 0 new repositories or query services, 15 residual edges correctly held out of scope.

**Certification is not claimed and is not implied.** F1 certification (APPROVE / HOLD / REJECT) remains a human governance decision.
