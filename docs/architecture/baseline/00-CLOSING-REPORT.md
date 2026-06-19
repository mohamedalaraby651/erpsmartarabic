# UX-0 — Closing Report

**Phase status:** ✅ **CLOSED** (Baseline Sign-off Gate passed)
**Date:** 2026-06-19
**Baseline tag:** `architecture-baseline-ux0` (recorded in `MANIFEST.json` → `environment.gitTag`)

---

## 1. Sign-off checklist

| # | Condition | Result |
|---|-----------|--------|
| 1 | All audit scripts ran without error | ✅ 10/10 reports generated |
| 2 | `verify-determinism.sh` PASS (run #1 == run #2, sha256) | ✅ PASS |
| 3 | Markdown + JSON consistent with `MANIFEST.json` | ✅ verified |
| 4 | Git tag `architecture-baseline-ux0` declared in MANIFEST | ✅ recorded |

> The git tag itself is created out-of-band by the maintainer; the manifest pins the intent (`environment.gitTag`).

## 2. Baseline numbers (Current Health)

| KPI | Value |
| --- | ----: |
| Direct DB access (UI) | **150** |
| `as any` total | **138** (infra: 37, ui: 26, tests: 73, legacy: 2, generated: 0) |
| `console.*` total | **120** (error-handler: 83, leftover: 32, telemetry: 3, debug: 2) |
| Files > 500 LOC | **7** |
| Files > 300 LOC | **93** |
| Circular dependencies | **6** |
| Import-layer violations | **202** |
| Bundle bytes (dist) | **4,920,767** (~4.7 MB) |
| `tsc --noEmit` errors | **0** |
| Vitest passing | **1187 / 1187** |
| Maintainability Index (avg) | **90.19** |
| Cyclomatic p95 (file-level) | **29** |
| Avg component LOC | **161.07** |
| Avg hook LOC | **100** |
| Avg props per component | **5.13** |
| Repository reuse (mean) | **2.91** |
| Query reuse (mean) | **4** |
| Repositories | **44** · Queries: **2** |
| Routes | **98** |
| Components/files | **873** |
| Total LOC | **143,669** |

## 3. Surprises vs. plan estimates

| Item | Plan estimate | Measured | Note |
|------|--------------:|---------:|------|
| Direct DB access (UI) | 161 | 150 | A2.5 cleanup reduced it; check-data-access.sh remains the CI gate. |
| `as any` | 111 | 138 | Plan estimate excluded tests (73 in tests). Infra+UI is **63**, still the meaningful target. |
| `console.*` | 44 | 120 | Plan estimate undercount. **83** are error-handlers (acceptable until logger lands). **34** to be removed in UX-1. |
| Files > 500 LOC | 4 | 7 | Three additional files crossed the threshold since the estimate. |

None of these reorder UX-1 priorities. Direct-DB and `as any` (infra+ui) remain the dominant items.

## 4. Completion Gate — answers to Q1–Q6

- **Q1 (surprises shift UX-1?):** No. The baseline confirms a foundation-first ordering (Q3) without re-prioritization. `circularDeps=6 < 40`, `bundle=4.7 MB < 9 MB`, `components=873 < 1000` — none of the reorder triggers fire.
- **Q2 (POC table for UX-1):** Recommend **`SuppliersTable`** — it has known shadow-repository history (RISK-001) and exercises the full table+filter+action drawer pattern. Decision is final at UX-1 kickoff.
- **Q3 (canonical primitives clear?):** The JSON `inventory.competingPrimitives` block lists every primitive present in both `components/ui/` and `components/ui-kit/`. Each becomes one ADR (ADR-0001…N) at UX-1 start; no reimplementation needed.
- **Q4 (ESLint rule schedule):** Confirmed — warn on `src/ui/**` in UX-1, error in UX-2. Coupled with the data-access ESLint rule (warn UX-1, error UX-2).
- **Q5 (metric forcing roadmap reorder?):** **No.** All triggers pass: cycles=6, bundle=4.7 MB, components=873. Proceed with the locked sequence UX-1 → UX-2 → UX-3 → UX-4.
- **Q6 (tools repeatable?):** **Yes.** `verify-determinism.sh` PASS on all 7 deterministic audits (`sha256sum` match between run #1 and #2). Performance (manual) and bundle (build-dependent) are explicitly excluded from determinism by design.

## 5. Next phase

Open **UX-1 — Foundation**: tokens, layout primitives, navigation, the `src/ui/` directory, ESLint `warn` rules for `as any` and direct DB access in UI, and ADR-0001+ for canonical primitives.
