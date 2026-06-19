# Baseline 07 — Bundle

> Source of truth: [`scripts/audits/output/bundle-report.json`](../../../scripts/audits/output/bundle-report.json) · Baseline: **UX-0**

## Numbers

| Metric | Value |
| ------ | ----: |
| Total bundle bytes (dist) | **4,920,767** (~4.7 MB) |
| Output assets | **91** |
| `rollup-plugin-visualizer` stats | **available** |

## Largest assets / dependencies

See JSON:
- `topAssets[]` — heaviest individual JS/CSS files.
- `topDependenciesGzip[]` — heaviest packages by gzipped size.
- `duplicatePackages[]` — placeholder; deep multi-version detection is deferred to UX-1 tooling.
- `treeShakingOpportunities[]` — empty in UX-0; populated in UX-8.

## UX-1 / UX-8 plan

1. UX-1 sets per-phase delta budget at **±5%** of the total bundle bytes.
2. UX-8 adds chunk-level budgets, route-level code-splitting, and the duplicate-package eradication pass.
