# PRE-PDF-001 — Root Cause & Remediation Record

- **Track:** Post-Exit Control Resolution — Control 3 (independent test-defect resolution)
- **Status:** ROOT CAUSE DOCUMENTED → REMEDIATED → EVIDENCE CAPTURED
- **Scope:** `src/lib/pdf/**` only. Not part of Batch B, not part of any architecture scope hash.

## 1. Symptom (as observed since Wave 1)

`vitest` reported 2 failing test **files** (never failing assertions):

```text
src/lib/pdf/arabic/arabicCss.test.ts        Parsing error: Unterminated string literal (20:57)
src/lib/pdf/engine/HtmlPdfEngine.test.ts    Parsing error: Unterminated string literal (96:66)
```

The same two files also accounted for 2 of the 39 ESLint errors — the same defect surfacing
through a second tool. They were counted as two independent problems; they were one.

## 2. Root cause (documented before the fix, per instruction)

A design-token codemod (`scripts/fixes/fix-design-tokens.mjs` / `fix-typography.mjs`, applied in
UX-3A Wave 2 Sprint 1 Batch A) rewrote raw color and font declarations across `src/**`.
It matched CSS text **inside template literals and inside test string assertions** in the PDF
subtree and replaced:

```text
font-family: 'Amiri'          →  font-family: var(--font-sans)
background: #ffffff           →  background: hsl(var(--background))
```

Two consequences, one visible and one silent:

| # | Consequence | Severity |
|---|---|---|
| 1 | In the two test files, the replacement ran past the closing quote of the expected-string literal, producing an unterminated string → parse error → PRE-PDF-001 | visible (test files fail) |
| 2 | In production PDF code, the render surface began referencing **app theme variables that do not exist in the PDF document** (`--font-sans`, `--background`) | silent functional defect |

Consequence 2 is the important one. The PDF render context is an isolated, print-only DOM: the
app stylesheet and its token layer are not present. `buildArabicCss()` embedded the Arabic font
via `@font-face` and then referenced `var(--font-sans)` — an undefined variable — so the embedded
font was never applied and `html2canvas` was handed an invalid `backgroundColor`.

**Root cause statement:** a UI-layer design-token rule was applied to a non-UI render boundary.
PDF output is a paper surface, not a themed application surface; it must not depend on runtime
theme tokens. This is the same class of defect as PRE-TS-001 — a contract applied outside the
boundary it owns.

## 3. Remediation (minimal, boundary-correct)

| File | Change |
|---|---|
| `src/lib/pdf/arabic/arabicCss.ts` | `var(--font-sans)` → `'${family}'` (the resolved, embedded font); `hsl(var(--background))` → `#ffffff` |
| `src/lib/pdf/engine/HtmlPdfEngine.ts` | container background → `#ffffff` |
| `src/lib/pdf/engine/chunkedRender.ts` | `html2canvas` `backgroundColor` → `#ffffff` |
| `src/lib/pdf/templates/*.ts` (Invoice, Quotation, PurchaseOrder, Statement) | `hsl(var(--background))` → `#ffffff` |
| `src/lib/pdf/arabic/arabicCss.test.ts`, `src/lib/pdf/engine/HtmlPdfEngine.test.ts` | restored the truncated expectation to `"font-family: 'Amiri'"` |

No test was weakened to make it pass: both restored assertions are **stronger** than the broken
text, since they now assert the actually-embedded family name.

## 4. Evidence

```text
bunx vitest run src/lib/pdf   →  40 files passed · 241 tests passed · 0 failed
node scripts/fitness/run-all.mjs → active 32 · pending 9 · failures 0
lint errors: 39 → 37 (the 2 parse errors are gone; no new rule violated)
```

## 5. Follow-up (not done here, recorded)

- The codemods in `scripts/fixes/**` have no exclusion for `src/lib/pdf/**` and no
  string-literal guard. Until they do, re-running them re-introduces this defect.
  Tracked as **RISK-008 — Codemod Boundary Leakage**; a fitness rule
  (`no theme tokens inside the PDF render boundary`) is the durable control.

## 6. Status

`PRE-PDF-001` — **CLOSED** (root cause documented, remediated, evidence captured).
`RISK-008` — **OPEN** (prevention, not repair).
