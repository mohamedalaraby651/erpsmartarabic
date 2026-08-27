# Wave 1 — Sprint 3.1 Batch B · PHASE C2 (Remediation + Evidence)

| Field | Value |
|---|---|
| Evidence ID | WAVE1-PHASEC2-001 |
| Baseline | BASELINE-NAZRA-001 @ `a33f49b9` |
| Contract | `docs/governance/BATCHB_SCOPE_001.md` (LOCKED) |
| Plan | `docs/architecture/WAVE1_SPRINT3_BATCHB_PHASEC1.md` (WAVE1-PHASEC1-001) |
| Scope Hash | `eab102bd71ccd916f5cf32284d27d0b03ed32008b0849b18687740f7fa32eb84` (unchanged) |
| Certification | **NOT CERTIFIED** — human review required |

## 1. Preflight checkpoint

`PRE-TS-001` recurred again (platform regeneration of `src/integrations/supabase/previewAuthStorage.ts`,
TS7011 @ 81/85). Handled as an **independent Preflight Unit before** any Batch B write:
minimal return-type annotations re-applied, no behavioural change, not part of the scope hash.

```text
tsgo (preflight)  exit 0
Batch B writes at preflight time: 0
```

## 2. Facades created (8, thin pure re-export)

`admin.ts` · `treasury.ts` · `expenses.ts` · `reference.ts` · `attendance.ts` ·
`quotations.ts` · `sales-orders.ts` · `purchase-orders.ts`

Each is `export * from "@/lib/repositories/<module>"` only — no business logic, no transformation,
no hooks. `admin.ts` re-exports the two admin-console read repositories (as approved in C1).
`src/application/queries/index.ts` gained eight namespace exports (declared supporting barrel).

## 3. Redirects executed — 16/16, exactly per the C1 matrix

Type-only rows (7) remained `import type`. Value rows (9) resolve to the identical exported symbol
through pure re-export — no runtime semantics changed. Row 15 (`CashRegisterDetailsPage`) changed only
the module-specifier line of its existing multi-line type import.

## 4. Scope verification

### File-level (Scope Hash)

`git diff --name-only a33f49b9 -- src | sort` → **25 files**:

```text
25 approved files (16 pages + 9 application/queries) == Approved set   ✔ exact equality
```

Actual − Approved = ∅ · Approved − Actual = ∅.
The PRE-TS-001 preflight file (`src/integrations/supabase/previewAuthStorage.ts`) is platform-regenerated;
it does not appear in the final delta and carries zero scope-hash impact.

### Item-level (mechanical assertion)

```text
SCOPE_BASE=a33f49b9 node scripts/audits/verify-item-scope.mjs
→ OK (authorized change only): src/pages/expenses/ExpensesPage.tsx
→ ITEM-LEVEL SCOPE: MATCH   (exit 0)
```

`git diff a33f49b9 -- src/pages/expenses/ExpensesPage.tsx` = exactly one changed import line
(row 10). Deferred row 13 (`mapRepoError from '@/lib/repositories/_base'`) byte-identical.
No formatting drift, no reordering, no cleanup.

## 5. Evidence (fresh, post-C2)

| Check | Result |
|---|---|
| `npx tsgo -p tsconfig.app.json --noEmit` | exit 0 |
| `npx vite build` | exit 0 (chunk-size warnings only) |
| `npx vitest run` | 1581 passed · 5 skipped · **3 pre-existing failures** (see below) |
| `npm run lint` | 39 errors / 865 warnings — **all pre-existing**, none introduced by the 25 approved files |
| `node scripts/fitness/run-all.mjs` | active=32 pending=9 **failures=0** |
| `node scripts/audits/dep-graph.mjs` | 1210 modules, 6 cycles, 155 layer violations |
| `node scripts/audits/codebase-inventory.mjs` | modules=174 files=1210 |
| item-scope assertion | MATCH |

### Pre-existing test failures (NOT touched — outside approved set)

- `src/lib/pdf/arabic/arabicCss.test.ts` — unterminated string constant (syntax)
- `src/lib/pdf/engine/HtmlPdfEngine.test.ts` — unterminated string constant (syntax)
- `src/domain/pdf/value-objects/PdfBranding.test.ts` — `contrastRatio` expected 21, got 1

All three sit in PDF modules untouched by C2 and are caused by an earlier raw-color token
substitution inside test string literals. Logged as `PRE-PDF-001`; repairing them inside C2 would
violate the scope contract → deliberately **not** fixed.

## 6. Delta vs BASELINE-NAZRA-001

| Metric | Before (`a33f49b9`) | After (C2) | Target | Status |
|---|---:|---:|---|---|
| `pages → repositories` | 27 | **11** | ≤ 13 | ✅ |
| Observed layer violations (total) | 171 | **155** | ≤ 155 | ✅ |
| UI cycles | 0 | **0** | 0 | ✅ |
| Total cycles | 6 | 6 | no regression | ✅ |
| Max FanOut | App.tsx 106 · CustomerDetailsPage 59 | identical | no regression | ✅ |
| Fitness failures | 0 | 0 | 0 | ✅ |
| Modules / edges | 1201 / 4771 | 1210 / 4789 | +9 facades, +18 edges | as planned |

Unchanged categories (out of Batch B scope): `components→repositories` 41 ·
`components→services` 5 · `hooks→supabase-client` 31 · `components→supabase-client` 38 ·
`pages→supabase-client` 29.

Deferred rows: **11, untouched**. STOP conditions triggered: **none**.

---

```text
PHASE C2 — IMPLEMENTATION COMPLETE
Scope:               HONOURED (file-level + item-level)
Scope Hash:          UNCHANGED
Evidence:            FRESH / AVAILABLE
Targets:             MET
Certification:       NOT CERTIFIED

STOP — HUMAN REVIEW REQUIRED → BASELINE-NAZRA-002
```
