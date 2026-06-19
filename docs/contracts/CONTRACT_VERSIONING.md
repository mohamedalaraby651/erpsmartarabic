# Contract Versioning Policy

**Status:** Active (UX-1, Wave 0)
**Current Contract Version:** `v1`

## Scope

Applies to every type or interface exported from `src/contracts/**` and tagged with `@contractVersion`. These contracts are the stable seam between UI/Workspaces and the data + service layers.

## Versioning Scheme

`vMAJOR.MINOR`

| Bump | Trigger |
|---|---|
| MAJOR (`v1 → v2`) | Breaking change: removed/renamed field, narrowed type, changed semantics, changed required-ness of a property, changed return shape |
| MINOR (`v1 → v1.1`) | Additive only: new optional field, new optional generic parameter with default, new method with default no-op, JSDoc-only changes |

Patch-level changes (typos, comments) do not bump version.

## Rules

1. Every contract file MUST start with a `@contractVersion vX[.Y]` JSDoc tag at the top-level export.
2. Breaking changes require an ADR (using `docs/adr/TEMPLATE.md`) and an entry in `docs/adr/INDEX.md`.
3. A breaking change MUST keep the old contract exported under its old name with `@deprecated` JSDoc for at least one UX phase before removal.
4. Consumers (`src/ui/**`, `src/workspaces/**`, `src/lib/repositories/**`) MUST import contracts only from `src/contracts/**` — never re-export modified shapes from elsewhere.
5. Generated Supabase types in `src/integrations/supabase/types.ts` are NOT contracts; contracts wrap them.

## Backward Compatibility Window

| Phase | Old contract status |
|---|---|
| Introduced | active |
| Successor introduced | `@deprecated` JSDoc + ADR |
| Next UX phase | removable, requires superseding ADR + INDEX update |

## Breaking Change Criteria (checklist)

A change is breaking if any answer is "yes":

- Does an existing consumer fail to type-check after the change?
- Does runtime behavior of an existing method change (return shape, ordering, error semantics)?
- Is a previously optional field now required?
- Is a previously nullable field now non-null (or vice versa)?
- Is a generic parameter added without a default?

## Deprecation Process

1. Add `@deprecated` JSDoc with replacement reference and ADR id.
2. Open ADR; update `docs/adr/INDEX.md` with `Supersedes` column.
3. Keep old contract for one UX phase minimum.
4. Removal PR cites the ADR and bumps MAJOR.

## Enforcement

- TypeScript strict mode catches shape regressions.
- `scripts/fitness/check-layering.mjs` enforces that consumers only import from `src/contracts/**`.
- Code review checks `@contractVersion` tag presence on every export touched.
