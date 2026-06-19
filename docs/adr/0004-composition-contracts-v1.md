# ADR-0004 — Composition Contracts v1

- **Status:** Accepted
- **Date:** 2026-06-19
- **UX Phase:** UX-1D
- **Supersedes:** —
- **Companion docs:** `docs/architecture/COMPOSITION_CONTRACTS.md`

## Context

After UX-1A (tokens), UX-1B (Shell), and UX-1C (canonical primitives), the
next surface needed by ERP workspaces is a **composition tier** — composites
built on top of primitives that encode shared interaction patterns (forms,
data grids, page chrome, result states) without leaking domain or runtime
concerns into the kernel.

Without explicit contracts and invariants at this layer, workspaces would
either re-invent each composite (causing API drift) or embed data-layer
calls inside composites (causing coupling that resists later refactors).

## Decision

We adopt **Composition Contracts v1** and a controlled composite library
under `src/ui/composites/**` governed by four locked decisions:

- **D1 — Contracts are compile-time only.** No Zod, no runtime validators.
  All contracts live in `src/ui/contracts/**` as `.ts` (never `.tsx`) and
  may import only via `import type`.
- **D2 — DataGrid is UI-state only.** Owns sort/selection/density/row-activation
  UI state. Never decides pagination strategy, never reads server semantics,
  never fetches.
- **D3 — CompositeEvent envelope is mandatory.** Every event a composite
  emits has the shape `{ type: string; payload: EventPayload }` where
  `EventPayload` is a shallow primitive-valued record.
- **D4 — Shell owns overlay lifecycle.** Composites describe overlays as
  declarative `OverlaySpec`s. Focus trap, stacking, escape handling, and
  portal lifecycle live exclusively in the Shell Dialog slot.

## Invariants

| ID | Invariant |
|----|-----------|
| C1 | Composites import only `@/ui/primitives`, `@/ui/contracts`, internal utils. |
| C2 | Contracts are pure TS. |
| C3 | All composite events use the `CompositeEvent` envelope. |
| C4 | All directional CSS uses logical properties. |
| C5 | No composite owns server state. |
| C6 | Public surface remains additive; primitive/token APIs unchanged. |
| C7 | Every composite is `@canonicalState`-tagged. |
| C8 | Contracts are compile-time only (no Zod, no validators). |
| C9 | DataGrid is UI-state only. |
| C10 | All composite-emitted events use the CompositeEvent envelope. |
| C11 | Shell owns all overlay lifecycle. |
| C12 | Composites are forbidden from data-layer awareness. |

## Enforcement

- `scripts/fitness/check-composite-isolation.mjs` (C1, C5, C12)
- `scripts/fitness/check-composite-primitive-only.mjs` (C1)
- `scripts/fitness/check-contract-purity.mjs` (C2, C8)
- `scripts/fitness/check-composite-event-envelope.mjs` (C3, C10)
- `scripts/fitness/check-overlay-ownership.mjs` (C11)
- `scripts/fitness/check-datagrid-domain-isolation.mjs` (C9)

## Consequences

- The composition tier becomes stable enough for UX-2 to wire a real data
  layer beneath it without modifying composites.
- New domain workspaces in UX-3 compose features by combining composites
  with workspace-owned state, never by extending composites internally.
- Runtime validation, if ever needed, lands at the workspace boundary in
  UX-2 — not inside contracts.
