# Composition Contracts (UX-1D)

This document describes the **composition tier**: the layer between
canonical primitives (UX-1C) and ERP workspaces (UX-3+). It implements
ADR-0004.

## Locked architectural decisions

| # | Decision |
|---|----------|
| D1 | Contracts are compile-time only. No runtime validators. |
| D2 | DataGrid handles UI state only. No data-layer awareness. |
| D3 | All composite events flow through the `CompositeEvent` envelope. |
| D4 | Shell owns overlay lifecycle. Composites describe, not execute. |

## Layer model

```text
Workspaces (UX-3)
   ↓
Composites (UX-1D)   ← this layer
   ↓
Primitives (UX-1C)
   ↓
Shell (UX-1B)
   ↓
Tokens (UX-1A)
```

## CompositeEvent envelope (D3)

```ts
type CompositeEvent<T extends string, P extends EventPayload> = {
  type: T;
  payload: P;
};
```

`EventPayload` is a shallow record of primitive values, primitive arrays,
or a single-level nested primitive record. No DOM nodes, no Promises, no
class instances.

## DataGrid UI-state model (D2)

The DataGrid composite is **controlled**. Callers own:

- `rows`, `columns`, `getRowId`
- `sort` (current sort UI state)
- `selection` (current selection UI state)
- `density`

The composite emits `GridUIEvent`s — `grid.sort.change`,
`grid.selection.change`, `grid.row.activate`, `grid.density.change`,
`grid.page.change` — and never decides pagination, fetching, or totals.

## Overlay ownership (D4)

`FormDialog` returns an `OverlaySpec` plus `open`/`close` helpers. It does
not render a portal, does not implement focus trap, and never touches
`react-dom`. The Shell Dialog slot consumes the spec and runs all overlay
runtime concerns.

## Invariants and enforcement

| ID | Invariant | Enforced by |
|----|-----------|-------------|
| C1 | Composites import only primitives + contracts. | `check-composite-isolation` |
| C2/C8 | Contracts are pure TS. | `check-contract-purity` |
| C3/C10 | All composite events use the envelope. | `check-composite-event-envelope` |
| C4 | Logical CSS only. | `check-rtl-logical-properties` (primitives), composite review |
| C5/C12 | No data-layer awareness. | `check-composite-isolation`, `check-datagrid-domain-isolation` |
| C6 | Additive public surface. | `check-token-export` + code review |
| C7 | Lifecycle tags present. | `check-canonical-lifecycle-tags` (primitives), review for composites |
| C9 | DataGrid UI-state only. | `check-datagrid-domain-isolation` |
| C11 | Shell-only overlay runtime. | `check-overlay-ownership` |
