# ADR Registry

**Sole source of truth** for every architectural decision in this project. Every new or superseded ADR MUST be added/updated in the same PR.

## Conventions

- ADRs are numbered sequentially: `ADR-0000`, `ADR-0001`, …
- Status: `Proposed` | `Accepted` | `Superseded` | `Deprecated`.
- `Supersedes` column lists ADR ids superseded by this one (most recent → oldest).
- `Area` matches the touched module / primitive / contract.

## Index

| ADR | Status | Supersedes | Area | UX Phase | Date |
|---|---|---|---|---|---|
| [ADR-0000](./0000-architecture-frozen-before-frontend-rewrite.md) | Accepted | — | Architecture freeze before frontend rewrite | UX-0 | 2026-06-18 |
| [ADR-0002](./0002-ui-shell-layout-only.md) | Accepted | — | UI Shell as layout-only OS | UX-1B | 2026-06-19 |
| [ADR-0003](./0003-canonical-primitives-v1.md) | Accepted | — | Canonical Primitive System v1 | UX-1C | 2026-06-19 |

<!--
New entries append below this line. Keep the table sorted by ADR id ascending.
When an ADR is superseded:
  - Update its Status column to "Superseded by ADR-XXXX".
  - Add the new ADR row with the old id(s) in the Supersedes column.
-->
