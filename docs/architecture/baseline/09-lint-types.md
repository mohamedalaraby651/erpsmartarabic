# Baseline 09 — Lint & Types

> Source of truth: [`scripts/audits/output/lint-types-report.json`](../../../scripts/audits/output/lint-types-report.json) · Baseline: **UX-0**

## Numbers

| Metric | Value |
| ------ | ----: |
| `tsc --noEmit` strict errors | **0** (no Hard Stop) |
| ESLint errors | **31** |
| ESLint warnings | **786** |
| `as any` total | **138** |
| `console.*` total | **120** |

## `as any` classification

| Category | Count |
| -------- | ----: |
| infrastructure (`lib/repositories`, `lib/queries`, `lib/services`) | **37** |
| ui (`components`, `pages`, `hooks`) | **26** |
| tests | **73** |
| legacy | **2** |
| generated (`src/integrations/`) | **0** |

> The plan's "111" pre-UX-0 estimate was lower because it excluded tests. The 138 number is the full classified total. The 63 hits in `infrastructure + ui` are the relevant UX-1 → UX-2 target.

## `console.*` classification

| Category | Count |
| -------- | ----: |
| error-handler (catch blocks, error paths) | **83** |
| leftover (no obvious reason) | **32** |
| telemetry | **3** |
| debug / fixme / temp | **2** |

> UX-1 removes the 32 "leftover" + 2 "debug" calls. Error-handler and telemetry calls remain until a proper logger is introduced (UX-1 or UX-8).

## Complexity / Maintainability

From `complexity-report.json` (heuristic, file-level proxy):

| Metric | Value |
| ------ | ----: |
| Cyclomatic p50 | (see JSON) |
| Cyclomatic p90 | (see JSON) |
| Cyclomatic p95 | **29** |
| Cyclomatic p99 | (see JSON) |
| Maintainability Index (avg, 0–100) | **90.19** |

> Method is a deterministic JS heuristic for UX-0. A real per-function CC tool is selected during UX-1 setup.
