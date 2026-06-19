# Baseline 01 — Repository Snapshot

> Source of truth: [`scripts/audits/output/snapshot-report.json`](../../../scripts/audits/output/snapshot-report.json) · Baseline: **UX-0**

## Numbers

| Metric | Value |
| ------ | ----: |
| Total files (src/**) | **932** |
| Total LOC | **143,669** |
| Top-level folders in `src/` | 14 |

## Top-level folders present

`__tests__`, `components`, `config`, `domain`, `hooks`, `integrations`, `lib`, `pages`, `styles`, `test`, `types`

## Target layers missing (gap vs. ERP UI OS)

- `src/ui/` — design-system primitives (planned UX-1)
- `src/contracts/` — UI ↔ Domain contracts (planned UX-2)
- `src/workspaces/` — workspace shells (planned UX-3)
- `src/workflows/` — workflow engine + definitions (planned UX-4)

> These four directories do not exist today. Their creation is the entire purpose of UX-1 → UX-4.

## Notes

The current structure is **feature-centric** (`components/{accounting,customers,invoices,…}`). Modernization re-orients toward **layer-centric** (`ui/`, `contracts/`, `workspaces/`, `workflows/`) without deleting the feature folders — they migrate progressively under the new shells.
