# BASELINE-NAZRA-002

- **Status:** SEALED (evidence-backed snapshot) — **NOT a certification**
- **Parent:** BASELINE-NAZRA-001 @ `a33f49b9`
- **Source commit:** `31052763bf683cd3b1b0467c48c619df116c961c` (C2 completion)
- **Scope:** `WAVE1-PHASEC2-001` — Wave 1 · Sprint 3.1 · Batch B (Phase C2)
- **Scope contract:** `docs/governance/BATCHB_SCOPE_001.md` (LOCKED)
- **Scope Hash:** `eab102bd71ccd916f5cf32284d27d0b03ed32008b0849b18687740f7fa32eb84` (unchanged)
- **Lock:** `scripts/audits/output/wave1-batchb-lock.json`
- **Machine-readable manifest:** `scripts/audits/output/baseline-nazra-002.json`
- **Composite SHA-256:** `1b4fafd5d784c0b28daa3fb25653368adc11745b38e5523852b563d4e24cdf87` (28 entries)
- **Model:** Baseline + Delta + Evidence — *not* a re-analysis of the project.

## 1. What this baseline represents

The **actual post-C2 state** of the system. It records the delta produced by the
authorized Batch B remediation and the evidence that was regenerated on top of it.
It grants no certification, does not pass G0, and does not open Phase 0 by itself.

## 2. Scope controls (all mandatory, all satisfied)

| Control | Result |
|---|---|
| File-level scope equality (`Actual == Approved`) | ✅ 25 / 25 |
| Scope Hash | ✅ unchanged |
| Item-level scope assertion (`verify-item-scope.mjs`) | ✅ MATCH |
| Deferred items | ✅ 11 untouched |
| Unauthorized hunk / formatting drift | ✅ none |
| Scope drift | ✅ none |

Success is defined as **change inside the authorized boundary**, not as reaching
the numeric targets.

## 3. Architecture state (measured, post-C2)

| Metric | BASELINE-NAZRA-001 | BASELINE-NAZRA-002 |
|---|---:|---:|
| `pages → repositories` | 27 | **11** |
| Layer violations (total, observed) | 171 | **155** |
| UI cycles | 0 | **0** |
| Total cycles | 6 | **6** |
| Modules / edges | 1201 / 4771 | 1210 / 4789 |
| Inventory modules / files | 174 / 1201 | 174 / 1210 |
| FanOut | App.tsx 106 · CustomerDetailsPage 59 | unchanged |

Residual violation categories (out of Batch B scope):
`components→repositories` 41 · `components→services` 5 ·
`hooks→supabase-client` 31 · `components→supabase-client` 38 ·
`pages→supabase-client` 29 · `domain→ui` 0.

## 4. Evidence (regenerated at seal time, not reused from C2 report)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsgo -p tsconfig.app.json --noEmit` | exit 0 |
| Build | `npx vite build` | exit 0 (chunk-size warnings only) |
| Lint | `npm run lint` | exit 1 — 39 errors / 865 warnings, **all pre-existing** |
| Tests | `npx vitest run` | exit 1 — **1581 passed / 1 failed / 5 skipped**, test files 154 passed / **3 failed** |
| Fitness | `node scripts/fitness/run-all.mjs` | exit 0 — active 32 · pending 9 · failures 0 |
| Dependency graph | `node scripts/audits/dep-graph.mjs` | exit 0 — 1210 modules, 6 cycles, 155 violations |
| Inventory | `node scripts/audits/codebase-inventory.mjs` | exit 0 — modules 174, files 1210 |
| Item scope | `SCOPE_BASE=a33f49b9 node scripts/audits/verify-item-scope.mjs` | MATCH |

> **Test suite is NOT green.** It is *1581 passing with 3 failing test files
> (PRE-PDF-001)*. This baseline explicitly refuses the reduction "tests green".

## 5. Open findings carried into this baseline

| ID | Status | Handling |
|---|---|---|
| `PRE-PDF-001` | OPEN — Deferred | Outside C2 scope. **Must not** be repaired opportunistically; needs its own scoped unit. 2 syntax/collection failures + 1 `contrastRatio` assertion. |
| `PRE-TS-001` | RECURRING — Platform Regeneration Drift | Recurrence **#4** handled at seal time as an independent preflight micro-change. Zero Batch B impact, zero scope-hash impact. **Root cause not yet investigated** — see §6. |
| `RISK-007` | OPEN — separate Security track | 6 items, `docs/risk-log/RISK-007-security-backlog.md`. 2FA containment recorded, 5 proofs outstanding, not certified. |

## 6. Process finding carried forward (not remediated here)

`PRE-TS-001` has now recurred **four times** purely from platform regeneration of
`src/integrations/supabase/previewAuthStorage.ts`. Repeatedly re-applying the
annotation treats the symptom. The chain

```text
canonical source? → generator? → regeneration trigger? → generated artifact
```

must be investigated as its own unit (candidate for Phase 0 boundary work, since
it is a *platform boundary ownership* question, not application code).

## 7. Position in the governance chain

```text
C2 Implementation → Evidence → C2 VERIFIED → Human Review
        → BASELINE-NAZRA-002 (this file)
        → G0 (Evidence Integrity)
        → Phase 0 (BOUNDARY_CATALOG.md · ADR-0031 · ADR-0044 · BASELINE-UX4-001)
        → TRUST / PRODUCT / COMMERCIAL in parallel
```

Phase 0 **does not fix business code**; it converts C2 results and current risks
into a judgeable, measurable Boundary Model. Consequential domains remain under
Smart Freeze until individually certified.

## 8. Immutability

Per ADR-0013 (R-BASE-1) this baseline is immutable. Any correction is
fix-forward via `BASELINE-NAZRA-003`. Integrity is re-verified on every CI run by
`scripts/fitness/check-baseline-tag-integrity.mjs`.

## 9. What this baseline does NOT claim

- ❌ Batch B Certified
- ❌ Architecture Certified
- ❌ G0 Passed
- ❌ Phase 0 started
