# ADR-0029 — UI API Uniformity Charter

- **Status:** Accepted
- **Date:** 2026-07-08
- **Wave:** UX-3A Wave 2.5

## Context

Wave 2 consolidates the design system (tokens). Wave 2.5 must consolidate
component **APIs** across the four UI layers, otherwise divergent props
(`color` vs `tone`, `intent` vs `variant`, missing `disabled` / `loading` /
`ref` forwarding) will re-fragment the system.

## Decision

All components in `src/ui/**` — across Primitives, Composites, Layout, and
Contracts — conform to a single API contract. Additive migration only; no
breaking changes.

### Uniformity requirements

Every applicable component must satisfy:

| Property | Rule |
|----------|------|
| `size` / `tone` / `variant` | Must reuse the union types exported from `src/ui/primitives/types.ts`. |
| `disabled` | Standard prop on interactive components. |
| `loading` | Standard prop on components that trigger async work. |
| `className` | Accepted and merged via `cn(...)`. |
| `data-testid` | Accepted and forwarded to the root element. |
| `ref` forwarding | `React.forwardRef` required for DOM-returning components. |
| `displayName` | Required on every `forwardRef` component. |
| `@canonicalState Canonical` | JSDoc tag on the component declaration. |
| `any` in exported types | Forbidden. |
| Contract test | One matching test in `__tests__/api-uniformity.test.ts`. |

### Scope

- **Layer A — Primitives** (`src/ui/primitives/**`)
- **Layer B — Composites** (`src/ui/composites/**`)
- **Layer C — Layout** (`src/ui/layout/**`)
- **Layer D — Contracts** (`src/ui/contracts/**`)

### Enforcement

- `scripts/fitness/check-ui-api-uniformity.mjs` — enforcing at Wave 2.5 close.
- Contract tests: `src/ui/{primitives,composites,layout}/__tests__/api-uniformity.test.ts`.
- Legacy props remain but are marked `@deprecated` and removed no earlier
  than Wave 4.

## Consequences

- One additional enforcing fitness check (33 → 34).
- All new components entering `src/ui/**` are gated by the uniformity check.
- Composites can reason about props polymorphically (`{ size, tone, variant }`)
  without adapters.
