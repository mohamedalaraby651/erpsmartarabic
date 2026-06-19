# Baseline 02 — Dependency Graph

> Source of truth: [`scripts/audits/output/dependency-report.json`](../../../scripts/audits/output/dependency-report.json) · Baseline: **UX-0**

## Numbers

| Metric | Value |
| ------ | ----: |
| Total modules | **933** |
| Total import edges | (see JSON `totalEdges`) |
| Circular dependency cycles | **6** |
| Import-layer violations (total) | **202** |

## Import-layer violations (measurement only — not blocked in UX-0)

Counted via `dependency-report.json → importLayerViolations.bySummary`:

- `components→repositories`
- `components→services`
- `pages→repositories`
- `hooks→supabase-client`
- `components→supabase-client`
- `pages→supabase-client`
- `domain→ui`

> A "violation" here means the import direction is one we plan to forbid starting UX-2 (ESLint `error`). In UX-0 it is data, not a defect.

## Action items deferred to UX-1+

1. UX-1: ESLint rule warning on each violation category.
2. UX-2: Same rule promoted to `error`. CI fails on any non-zero count.
3. UX-1: Resolve all 6 circular cycles (target → 0).

## Repeatability

Run reproduced byte-for-byte by `verify-determinism.sh` (run #1 vs run #2 SHA-256 match).
