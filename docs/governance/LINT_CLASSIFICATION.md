# Lint Error Classification — Control 4

- **Track:** Post-Exit Control Resolution — Control 4 (classification and ownership)
- **Explicit non-goal:** no "fix the 39" cleanup batch. Classification first, ownership second,
  remediation only where an owner and a boundary exist.
- **Count at Phase 0 exit:** 39 errors / 865 warnings
- **Count now:** **37 errors** / 865 warnings — the 2 removed were the PRE-PDF-001 parse errors,
  fixed as part of Control 3, not as lint cleanup.

## 1. Answer to "same root cause?"

No. The 37 errors resolve into **5 distinct ownership classes**, not one. This is why a single
cleanup batch would have been scope creep with no verifiable exit criterion.

## 2. Classification

| Class | Errors | Files | Rules | Owner | Disposition |
|---|---:|---|---|---|---|
| **A — Vendored / generated UI** | 3 | `components/ui/command.tsx`, `components/ui/textarea.tsx`, `ui/primitives/Toast.tsx` | `no-empty-object-type` | shadcn upstream shape (empty interface extending a supertype) | **Do not fix.** Same ownership defect class as PRE-TS-001: a project rule applied to non-project-authored shape. Rule scope should be narrowed instead. |
| **B — Tooling / test harness (outside app runtime)** | 3 | `tailwind.config.ts`, `e2e/helpers/exportAssertions.ts` | `no-require-imports` | Frontend Platform | **Do not fix.** CommonJS is correct in these contexts; config files are not app modules. Narrow the rule's file scope. |
| **C — Deliberate telemetry / dev idioms** | 12 | `hooks/useAppBadge.ts` (4), `lib/performanceMonitor.ts` (6), `lib/syncManager.ts` (1), `pages/reports/ReturnsReportPage.tsx` (1) | `no-unused-expressions` | Frontend Platform | **Real but low-risk.** All are optional-call / short-circuit idioms (`x?.()`, `a && b()`). Mechanical, zero-behaviour rewrite. Batch only when a wave already touches these files. |
| **D — Arabic/PDF text-processing regexes** | 6 | `lib/arabicFont.ts` (3), `lib/pdf/utils/filename.ts` (2), `components/customers/dialogs/CustomerFormDialog.tsx` (1), `components/print/UnifiedExportMenu.tsx` (1) | `no-misleading-character-class`, `no-control-regex`, `no-useless-escape` | Arabic Text / PDF boundary | **Requires review, not autofix.** These regexes intentionally handle combining marks, bidi control characters and filename sanitisation. `--fix` here can silently change Arabic text behaviour. Any change needs a text-processing test first. |
| **E — Genuine legacy defects** | 13 | `lib/pdfGenerator.ts` (3 `prefer-rest-params`), `lib/syncStrategies.ts` (3 `no-case-declarations`), `lib/services/supplierService.ts` (1 `no-unsafe-function-type`), `supabase/functions/mcp/index.ts` (5 `no-var`) | mixed | respective domain owners | **The only class that is a defect in the ordinary sense.** `no-case-declarations` in `syncStrategies.ts` is the highest-value item: block-scope leakage in a sync switch is a correctness risk, not style. |

Totals: A 3 · B 3 · C 12 · D 6 · E 13 = **37**.

## 3. Ownership conclusion

```text
Rule scope defect   → A + B   (6)   the rule is wrong, not the code
Style / idiom       → C       (12)  safe, defer to a touching wave
Domain-sensitive    → D       (6)   needs behaviour tests before any edit
Real defects        → E       (13)  schedule per domain owner
```

**6 of 37 errors are not code defects at all** — they are ESLint configuration applied outside
its legitimate boundary. Fixing code to satisfy a misscoped rule would repeat the PRE-TS-001
mistake at a smaller scale.

## 4. Not done here (deliberately)

- No ESLint config change (that is a tooling change; it belongs to whichever wave owns the rule scope).
- No `--fix` run.
- No remediation of classes C, D, E.

## 5. Status

Control 4 — **CLASSIFIED**. Lint errors remain **OPEN (37)**, now with owners and dispositions
instead of a single undifferentiated number.
