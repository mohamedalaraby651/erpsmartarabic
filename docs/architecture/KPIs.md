# Architecture KPIs

Two distinct sections. Conflating them is forbidden.

- **Section 1 — Current Health** describes the codebase as it exists at the end of UX-0. It is *evidence*, not a problem list.
- **Section 2 — Targets** describes where each KPI must move, and in which phase.

All numeric values in Section 1 are populated from `scripts/audits/output/*.json` and mirrored into `docs/architecture/MANIFEST.json` (`health` block). `TBM` = *to be measured during UX-0 audit run*.

---

## Section 1 — Current Health (Baseline UX-0)

| KPI | Value | Source |
| --- | ---: | --- |
| Direct DB access in UI (`src/components/**` + `src/pages/**`) | 161 | `data-access-report.json` |
| `as any` total | 111 | `lint-types-report.json` |
| `as any` — infrastructure | TBM | `lint-types-report.json` |
| `as any` — ui | TBM | `lint-types-report.json` |
| `as any` — tests | TBM | `lint-types-report.json` |
| `as any` — legacy | TBM | `lint-types-report.json` |
| `as any` — generated | TBM | `lint-types-report.json` |
| `console.*` total | 44 | `lint-types-report.json` |
| `console.*` — debug | TBM | `lint-types-report.json` |
| `console.*` — error-handler | TBM | `lint-types-report.json` |
| `console.*` — telemetry | TBM | `lint-types-report.json` |
| `console.*` — leftover | TBM | `lint-types-report.json` |
| Files > 500 LOC | 4 | `component-report.json` |
| Circular dependencies | TBM | `dependency-report.json` |
| Bundle size gzipped (total) | TBM | `bundle-report.json` |
| Top chunk gzipped | TBM | `bundle-report.json` |
| Vitest passing | 1187 / 1187 | `tests` report |
| `tsc --noEmit` errors | 0 (Hard Stop if > 0) | `lint-types-report.json` |
| Maintainability Index (avg) | TBM | `complexity-report.json` |
| Cyclomatic complexity p95 | TBM | `complexity-report.json` |
| Avg component LOC | TBM | `component-report.json` |
| Avg hook LOC | TBM | `component-report.json` |
| Repository reuse (consumers / repo, mean) | TBM | `data-access-report.json` |
| Query service reuse (consumers / query, mean) | TBM | `data-access-report.json` |
| Avg props per component | TBM | `component-report.json` |
| Import Layer Violations (total) | TBM | `dependency-report.json` |

## Section 2 — Targets

| KPI | Target | Phase |
| --- | --- | --- |
| Direct DB access in UI | 0 | UX-2 → UX-7 |
| `as any` (infrastructure + ui) | 0 | UX-1 → UX-2 |
| `console.*` (leftover) | 0 | UX-1 |
| Files > 500 LOC | 0 | UX-5 → UX-7 |
| Circular dependencies | 0 | UX-1 |
| Bundle size delta per phase | ±5% max | every phase |
| Vitest passing | ≥ 1187 (never regress) | every phase |
| `tsc --noEmit` errors | 0 | UX-1 |
| Import Layer Violations | 0 | UX-2 |
| Maintainability Index (avg) | ≥ baseline + 10% | UX-5 |
| Cyclomatic p95 | ≤ 15 | UX-7 |
| Repository reuse (mean) | ≥ 2.0 | UX-2 |

> **Rule:** A KPI in Section 1 is never a “problem” by itself. It only becomes one when it diverges from its Section 2 target in a phase that owns it.
