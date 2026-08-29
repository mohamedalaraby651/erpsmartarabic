# POST-EXIT CONTROL RESOLUTION — Evidence & Delta Record

- **Record ID:** `PXC-NAZRA-001`
- **Authorization:** Human — "Phase 0 Post-Exit Control Resolution" (classification/closure of the
  four blockers revealed by Phase 0). **Phase 1 is NOT authorized by this record.**
- **Mode:** Baseline + Delta + Evidence. No full re-analysis. No Material Change Trigger fired.
- **Parent:** `PHASE0-NAZRA-001` (Phase 0 COMPLETE) · `BASELINE-NAZRA-002` (SEALED) · `G0-NAZRA-001` (PASS)
- **Successor baseline:** `BASELINE-UX4-001` — remains **DRAFT / NOT SEALED**
- **Certification:** **NOT GRANTED.** Boundaries certified: **0 / 8**.

## 1. The four controls

| # | Control | Entry status | Exit status | Record |
|---|---|---|---|---|
| 1 | PRE-TS-001 — ownership / root-cause decision | Recurrence #6, root cause unresolved | **RESOLVED** — Option A′ adopted; typecheck now 0 diagnostics | `docs/architecture/PRE-TS-001-ROOT-CAUSE.md` §8 |
| 2 | RISK-007 — security classification & plan | 6 findings, undifferentiated | **CLASSIFIED / PLANNED** — collapsed to 3 units; still OPEN, no remediation authorized | `docs/security/RISK-007-REMEDIATION-PLAN.md` |
| 3 | PRE-PDF-001 — independent test-defect resolution | 2 failing test files, cause unknown | **CLOSED** — root cause documented, then remediated | `docs/governance/PRE-PDF-001-ROOT-CAUSE.md` |
| 4 | 39 lint errors — classification & ownership | one undifferentiated number | **CLASSIFIED** — 5 ownership classes, 37 remain OPEN with owners | `docs/governance/LINT_CLASSIFICATION.md` |

## 2. What the controls actually revealed

Two of the four blockers turned out to be the **same class of defect**, and it is the class
Phase 0 was created to expose:

```text
A contract was applied outside the boundary that owns it.

PRE-TS-001   project strictness contract  →  platform-owned generated artifact
PRE-PDF-001  UI theme-token contract      →  PDF print render boundary
LINT class A/B  app lint rules            →  vendored UI + tooling files (6 of 37 errors)
```

Three separate symptoms, one governance failure mode. That is a stronger finding than any of
the individual fixes.

A second, uncomfortable finding is recorded in PRE-TS-001 §8.1: recurrences #1–#6 annotated the
wrong function. The compiler had been reporting the correct column for six iterations. The
recurrence was attributed to platform drift because drift was the available narrative.

## 3. Delta evidence (vs. Phase 0 exit)

| Check | Phase 0 exit | Now | Δ |
|---|---:|---:|---|
| `npx tsgo -p tsconfig.app.json --noEmit` | exit 2 (2 × TS7011) | **exit 0** (0 diagnostics) | resolved |
| `node scripts/audits/typecheck-app.mjs` | did not exist | **PASS** — total 0 · platform 0 · project 0 | new control |
| `bunx vitest run` | 1581 pass · 3 failed files | **1592 pass · 0 failed** · 157 files · 5 skipped | resolved |
| ESLint errors | 39 | **37** (the 2 removed were PDF parse errors) | −2 |
| ESLint warnings | 865 | 865 | unchanged |
| `node scripts/fitness/run-all.mjs` | active 32 · pending 9 · failures 0 | **active 32 · pending 9 · failures 0** | unchanged |
| `node scripts/audits/dep-graph.mjs` | 1210 modules · 6 cycles · 155 violations | **1210 · 6 · 155** | unchanged |
| `pages → repositories` | 11 | **11** | unchanged |
| UI cycles | 0 | **0** | unchanged |
| Boundaries certified | 0 / 8 | **0 / 8** | unchanged |

Architecture metrics are unchanged **by design**: no architecture code was touched. The delta is
confined to the PDF render boundary, the two PDF/branding test files, the platform artifact
annotation, and new tooling + documentation.

## 4. Change surface (complete)

```text
new    scripts/audits/typecheck-app.mjs
new    docs/governance/PRE-PDF-001-ROOT-CAUSE.md
new    docs/governance/LINT_CLASSIFICATION.md
new    docs/security/RISK-007-REMEDIATION-PLAN.md
new    docs/governance/POST_EXIT_CONTROL_RESOLUTION.md   (this record)
edit   docs/architecture/PRE-TS-001-ROOT-CAUSE.md        (§8 decision)
edit   docs/governance/EXCEPTION_REGISTER.md             (EXC-001 closed, EXC-002 dormant)
edit   src/integrations/supabase/previewAuthStorage.ts   (preflight annotation, inner callback)
edit   src/lib/pdf/arabic/arabicCss.ts
edit   src/lib/pdf/engine/HtmlPdfEngine.ts
edit   src/lib/pdf/engine/chunkedRender.ts
edit   src/lib/pdf/templates/*.ts
edit   src/lib/pdf/arabic/arabicCss.test.ts
edit   src/lib/pdf/engine/HtmlPdfEngine.test.ts
edit   src/domain/pdf/value-objects/PdfBranding.test.ts
```

No change to: `src/application/**`, `src/domain/finance/**`, `src/infrastructure/**`,
`src/platform/**`, `supabase/migrations/**`, any repository, any facade, any scope-hashed file.
`BATCHB-SCOPE-001` is untouched; `BASELINE-NAZRA-002` lineage is intact.

## 5. Findings still open

| Finding | Status |
|---|---|
| `RISK-007` (6 findings → SEC-U1/U2/U3) | **OPEN** — planned, unauthorized |
| Lint errors (37, classes A–E) | **OPEN** — classified, owners assigned |
| `RISK-008` — codemod boundary leakage (`scripts/fixes/**` has no PDF exclusion) | **OPEN** — new, discovered in Control 3 |
| `PRE-TS-001` residual regeneration risk | **CONTAINED** — Option C deferred to Phase 1 / BND-01 |
| Boundary certification | **0 / 8** |

## 6. Explicit non-claims

```text
Controls resolved  ≠  Architecture PASS  ≠  Security PASS  ≠  Production Ready
```

No agent self-certification. `BASELINE-UX4-001` stays DRAFT. Smart Freeze remains ACTIVE for
Tenant Authority, Permission, Ledger Posting, Payment, Stock Movement and Sync Semantics.

## 7. Next step

```text
POST-EXIT CONTROL RESOLUTION (this record)
        ↓
G0 / Evidence Refresh
        ↓
Human Review
        ↓
PHASE 1 — Tenant Isolation + Authorization / PDP   (NOT AUTHORIZED YET)
```
