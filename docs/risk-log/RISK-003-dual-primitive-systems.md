# RISK-003 — Dual Primitive Systems (Canonical + Legacy shadcn)

- **Opened:** 2026-06-19 (UX-1C)
- **Status:** Active — mitigated, scheduled for closure in UX-2 entry gate.
- **Owners:** ERP UI Platform
- **Severity:** Medium

## Summary

UX-1C ships a canonical primitive set under `src/ui/primitives/**` while the
legacy `src/components/ui/*` shadcn set remains in use across pages and
workspaces. Both systems coexist by design.

## Why it's a risk

- Two `Button`, two `Input`, two `Dialog` exist simultaneously — developers
  may import from the wrong path.
- Visual drift if a legacy primitive is edited without matching changes
  to the canonical one.
- Bundle cost: until migration, both surfaces ship.

## Mitigation (UX-1C)

- Canonical set is the sole export from `src/ui/index.ts`. Workspaces
  (UX-2+) MUST import from `@/ui` only.
- `ADR-0003` names canonical primitives as successors.
- Lifecycle tag forces conscious authorship; legacy files are untagged
  and will be flagged at UX-2 entry.

## Resolution plan

- UX-2 entry gate: introduce ESLint rule banning new imports from
  `src/components/ui/*`, codemod existing call sites, mark legacy files
  `@deprecated`, then remove after one full UX phase (per
  `CANONICAL_COMPONENT_CRITERIA.md` lifecycle rules).

## Tracking

- Closes after `check-canonical-components.mjs` reports zero legacy
  imports in non-test code and the `src/components/ui/*` directory is
  removed.
