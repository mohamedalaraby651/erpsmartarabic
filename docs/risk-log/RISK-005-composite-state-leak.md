# RISK-005 — Composite state leak

- **Phase introduced:** UX-1D
- **Status:** Active, contained
- **Owner:** UI Architecture

## Description

A composite under `src/ui/composites/**` could accidentally subscribe to a
query, store, or repository — turning the composition layer into a hidden
data-access surface and re-coupling UI with the data layer. This would
violate Invariants C5, C9, and C12 and invalidate the layered model.

## Mitigations

- `check-composite-isolation.mjs` rejects imports from query/repository/
  integration paths, `@tanstack/react-query`, `axios`, `supabase`, and raw
  `fetch`.
- `check-datagrid-domain-isolation.mjs` extends the ban to identifier-level
  scans inside the data composite folder.
- Composites are controlled by design — they accept state as props and
  emit `CompositeEvent`s, never reach for ambient state.
- Code review checklist for UX-2 wiring: data layer integration happens
  in workspace adapters, never inside `src/ui/composites/**`.

## Trigger conditions for re-evaluation

- Any composite needs ambient state (e.g. tenant context). Solution: pass
  via prop or via a workspace-owned adapter; never via a `useQuery` inside
  the composite.
- Any composite needs caching. Solution: caller passes already-cached
  data; composite stays presentational.
