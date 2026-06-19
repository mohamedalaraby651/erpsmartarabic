# ADR-0002 — UI Shell as Layout-Only OS

- **Status:** Accepted
- **Date:** 2026-06-19
- **UX Phase:** UX-1B
- **Supersedes:** —

## Context

UX-1B introduces the ERP UI Shell (`src/ui/layout/**` + `src/ui/providers/**`). Without a written boundary, future contributors will be tempted to put business state, data fetching, permission resolution, or feature logic inside the Shell — the same accident that produced the `AdaptiveShell` / `AppHeader` coupling we are migrating away from.

## Decision

> **The Shell owns layout only.**

The Shell is responsible for:

- Composing the global frame (sidebar, topbar, status bar, command palette, notification center, user menu).
- Owning **layout state** (`ShellLayoutState` v1 — sidebar collapsed, density, theme mode/variant, direction).
- Exposing **registries** (workspaces, slots, commands, shortcuts, events, location).
- Delegating routing decisions to a `LocationAdapter`.
- Delegating notification sources to a `NotificationProvider`.
- Delegating user identity to a `ShellUser` prop on `ShellProvider`.

The Shell is **explicitly NOT** responsible for:

- **Business state** (orders, invoices, customers, balances).
- **Repositories or data fetching** (no `@/lib/repositories/*`, no `@supabase/*`).
- **Permissions resolution** (the Shell consumes a `Set<string>`; it does not derive it).
- **Query caching** (TanStack Query, SWR, etc. live in workspaces).
- **Feature logic** (no domain rules; no "if module Finance is enabled then…").

Workspaces are registered as **data** through `WorkspaceProvider`. Adding a new workspace requires zero edits inside `src/ui/layout/**` or `src/ui/providers/**`. This is enforced by `scripts/fitness/check-shell-isolation.mjs` and the matching ESLint `no-restricted-imports` rule.

## Consequences

**Positive**
- The Shell stays small, testable, and reusable across products.
- Workspaces become plug-ins; UX-4 Plugin SDK is a serialization concern, not a refactor.
- Token discipline + a11y can be enforced at one boundary.

**Negative**
- Workspaces must own their data lifecycles; there is no Shell-level cache to lean on.
- Cross-workspace concerns (e.g. global search) must route through registries (commands, slots) rather than direct imports.

## Enforcement

- `scripts/fitness/check-shell-isolation.mjs` — fails on forbidden imports.
- `scripts/fitness/check-shell-token-only.mjs` — fails on hardcoded color / radius / font-family literals.
- `scripts/fitness/check-shell-a11y.mjs` — flags icon-only buttons without `aria-label`, `<img>` without `alt`, positive `tabIndex`.
- `scripts/fitness/check-shell-runtime-purity.mjs` — forbids data-fetching libs (`@tanstack/react-query`, `swr`, `axios`, raw `fetch(`, `useQuery`/`useMutation`) inside Shell paths.
- `scripts/fitness/check-workspace-api-shape.mjs` — verifies `WorkspaceManifest` round-trips through `JSON.stringify`.
- `src/ui/layout/__tests__/shell-invariants.test.ts` — runtime invariants I2 / I3 / I7 / I8.
- ESLint `no-restricted-imports` rule on `src/ui/layout/**` and `src/ui/providers/**` (warn in UX-1B, error in UX-2).

## Notes

- `WorkspaceDefinition` evolves under `@contractVersion v1.1` (additive over the v1 manifest frozen in `docs/architecture/WORKSPACE_API.md`); breaking changes require a new ADR per `docs/contracts/CONTRACT_VERSIONING.md`.
- Detailed Shell behaviour contracts live in [`docs/architecture/SHELL_INVARIANTS.md`](../architecture/SHELL_INVARIANTS.md) (I1–I8).
