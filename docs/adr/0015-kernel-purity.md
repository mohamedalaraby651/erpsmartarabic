# ADR-0015 — Kernel Purity

- **Status:** Accepted
- **Date:** 2026-07-04
- **Related:** ADR-0014 (Frontend Platform Charter), UX3A §Kernel
- **Reference:** [DEPENDENCY_RULES.md §Kernel](../architecture/DEPENDENCY_RULES.md)

## Context

The Kernel is the innermost frontend layer. It hosts pure primitives (identity, clock, culture, i18n contract, env, feature flags, tenant, permissions) that must remain independent of React, the DOM, the network, Supabase, and every other browser or backend surface.

## Decision

1. `src/kernel/**` MUST NOT import from React, ReactDOM, Supabase, `@/integrations/**`, `@/platform/**`, `@/ui/**`, `@/components/**`, `@/features/**`, `@/pages/**`, `@/domain/**`, `@/application/**`, or `@/infrastructure/**`.
2. `src/kernel/**` MUST NOT reference browser globals (`window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `WebSocket`, `caches`, `indexedDB`, `location`, `history`), including via `globalThis`. Enforced by `check-kernel-browser-globals.mjs`.
3. All kernel exports flow through the `@/kernel` façade (`src/kernel/index.ts`). Deep imports from outside the layer are forbidden.

## Consequences

- Kernel modules are trivially unit-testable and deterministic.
- Platform adapters bind kernel abstractions to concrete host capabilities.
- Violations halt CI at the fitness gate.

## Enforcement

- `check-platform-layering.mjs` (R3/kernel-purity)
- `check-kernel-browser-globals.mjs`
