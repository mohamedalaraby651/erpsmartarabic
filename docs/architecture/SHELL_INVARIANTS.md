# Shell Invariants Contract

- **Status:** Ratified
- **Owner:** ERP UI Platform
- **Applies to:** `src/ui/layout/**`, `src/ui/providers/**`, `src/ui/hooks/**`
- **Phase:** UX-1B exit gate → enforced through UX-2+
- **Companion ADR:** [ADR-0002 — UI Shell as Layout-Only OS](../adr/0002-ui-shell-layout-only.md)

This document is the **single source of truth** for what the UI Shell is and is not allowed to do. Every invariant below is enforced by a fitness function, a runtime test, or both. A violation is treated as a build break — never a TODO.

---

## I1 — Shell is stateless regarding business context

The Shell stores **layout state only** (`ShellLayoutState` v1). It MUST NOT store:

- Domain state (orders, invoices, customers, balances, journals).
- Permission **derivation** (the Shell consumes a frozen `ReadonlySet<string>`; it never queries a roles table).
- Data fetching caches (TanStack Query, SWR, RTK Query, etc.).
- Repository handles, Supabase clients, or HTTP clients.

**Enforcement:**
- `scripts/fitness/check-shell-isolation.mjs` — forbids `@/lib/repositories/**`, `@/integrations/**`, `@supabase/*`.
- `scripts/fitness/check-shell-runtime-purity.mjs` — forbids `@tanstack/react-query`, `axios`, raw `fetch(` calls, `useQuery`, `useMutation` inside Shell paths.

---

## I2 — `ShellEventBus` is UI-only (Q1 answer)

> **Guarantee:** `ShellEventBus` is a UI lifecycle bus. It MUST NOT carry domain, workflow, or business-process state.

Concretely:

- **Allowed payloads:** UI lifecycle facts already declared in `ShellEventMap` (workspace switched, sidebar collapsed, theme changed, palette opened/closed, command executed). All payloads are flat, serializable, and contain identifiers only — never entities.
- **Forbidden payloads:** invoices, customers, line items, balances, query results, repository objects, React nodes, functions, class instances.
- **Forbidden patterns:** using the bus as request/response (no `emit("getInvoice", …)` style), as a cache, as a global store, or as a cross-workspace message router for business data.
- **Listener contract:** listener throws are swallowed (`events.ts`) so a buggy plugin can never break the Shell.

`ShellEventMap` is part of the v1.1 contract; adding a new event requires (a) an additive minor bump, (b) a payload that contains only IDs / enums / primitives, and (c) an ADR if the event implies cross-workspace coordination.

**Enforcement:**
- TypeScript: `ShellEventMap` keys are a closed union; arbitrary `emit("…")` calls do not type-check.
- `shell-invariants.test.ts` — asserts every payload value is one of `string | number | boolean | null | undefined`.

---

## I3 — Command ordering is fully deterministic (Q2 answer)

> **Algorithm:** stable sort by `(priority asc, group asc, id asc)`.
>
> 1. `priority` — `number`, default `50`. Lower runs first (matches existing `CommandDef` doc).
> 2. `group` — lexicographic, `undefined` sorts as `""` (so ungrouped commands appear before any named group of the same priority).
> 3. `id` — lexicographic. Guaranteed unique → total ordering, no tie remains.
>
> Free-text search (`query !== ""`) is layered on top: fuzzy score desc first, then the deterministic key as tiebreaker.

This guarantees:
- The Command Palette renders the same list across runs, machines, and locales.
- Snapshot tests are stable; regressions are caught at PR time.
- Plugins (UX-4) cannot accidentally re-order each other by registration order.

**Enforcement:**
- `shell-invariants.test.ts` — fixture with shuffled inputs must produce a fixed sequence.

---

## I4 — `SlotRegistry` slots are render-only (Q3 answer)

> **Guarantee:** A `SlotEntry.render` is a pure React render function. It MUST NOT:
>
> - Execute Shell mutations (no `setActiveWorkspace`, no `registry.register`, no `layout.toggle*` from inside `render`).
> - Dispatch side-effects synchronously during render (no `events.emit`, no network calls, no `localStorage` writes).
> - Return anything other than a `ReactNode`.
>
> Side-effects belong inside the rendered component's `useEffect` / event handlers — never in the slot function itself.

Slots are **render targets**, not a dependency-injection or RPC channel. The Plugin SDK (UX-4) will rely on this guarantee: a manifest-loaded plugin can ship a slot entry without being able to mutate Shell internals.

**Enforcement:**
- Type: `render: () => ReactNode` (no second argument, no context object — by design).
- Lint rule (UX-2 graduation): slot entries are linted for forbidden API access inside the `render` closure.

---

## I5 — `WorkspaceRegistry` is mutated outside React render

- `register` / `unregister` / `replace` MUST be called from event handlers, effects, lifecycle hooks, or app boot — never inside a component's render body.
- Re-renders are driven by `registry.subscribe` only; consumers must not introspect internal state.
- External code receives the `WorkspaceRegistry` interface, not the underlying `Map`. The map is closure-private (`src/ui/layout/registry.ts`).

**Enforcement:** runtime test asserts that calling `register` inside a render throws or warns; structural test asserts no `Map` is exported from `registry.ts`.

---

## I6 — `LocationAdapter` is a read interface + optional navigation

- `pathname()`, `params()`, `query()` are pure reads.
- `subscribe()` is the only push channel; it must not carry payloads.
- `navigate()` is optional and imperative — no business routing rules, no permission checks, no workspace selection inside the adapter.

Workspace-aware routing (active workspace ↔ URL prefix) lives in **UX-1C `ReactRouterAdapter`**, not in the default adapter.

---

## I7 — Provider independence

- Layout, Theme, Shortcut, and Workspace state are independent. Switching workspaces does not reset sidebar collapse, theme, or density.
- `LayoutProvider` is the only writer of `ShellLayoutState`; persistence is versioned (`VersionedShellLayoutState.version = 1`).

**Enforcement:** `shell-invariants.test.ts` — workspace switch keeps `sidebarCollapsed` and `themeMode` unchanged.

---

## I8 — No command leakage between workspaces

When the active workspace changes, the Command Palette stream is recomputed from `active.commands` + `extraCommands` (global) only. Commands belonging to inactive workspaces are unreachable, even through fuzzy search.

**Enforcement:** `shell-invariants.test.ts` — register two workspaces, activate A, assert B's commands are not in `filtered`.

---

## Hard Stops (Shell layer)

These trigger an immediate halt and ADR:

1. Any new dependency in `src/ui/**` from `@/lib/repositories/**`, `@/integrations/**`, `@supabase/*`, `@tanstack/react-query`.
2. Any new field on `ShellEventMap` whose payload is not `JSON.stringify`-safe.
3. Any change to `SlotEntry.render`'s signature.
4. Any export of the underlying `Map` / `Set` from a registry module.

## Change Procedure

Invariants are versioned with the Shell. Modifying any I1–I8 requires:

1. An ADR superseding the relevant section.
2. A `@contractVersion` bump on `WorkspaceDefinition` if the contract surface changes.
3. Updated fitness checks **before** the code change lands.
