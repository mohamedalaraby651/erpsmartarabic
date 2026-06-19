# State Hierarchy

**Status:** Active (UX-1, Wave 0)

## Layers (highest to lowest)

```text
Global  →  Workspace  →  Workflow  →  Screen  →  Component
```

| Layer | Owner | Examples | Storage |
|---|---|---|---|
| Global | App root | auth user, tenant, theme, locale, feature flags | React context + persisted prefs |
| Workspace | `WorkspaceProvider` | active workspace id, permissions, breadcrumbs, workspace-scoped filters | React context per workspace mount |
| Workflow | Multi-step flow (e.g. create-invoice wizard) | wizard step, draft buffer | `useReducer` co-located with the flow |
| Screen | Route component | list filters, selection set, sort, pagination | `useState` / `useListState` |
| Component | Leaf component | input value, hover, open/closed | `useState` |

## Rules

1. **Lowest responsible owner.** State lives at the lowest layer that needs it. Lifting up requires a written reason (PR description suffices).
2. **No cross-layer mutation.** A lower layer may read from a higher layer (via context) but never mutate it directly — use callbacks exposed by the higher layer.
3. **No prop-drilling past depth 4** (see `UI_PERFORMANCE_BUDGET.md`). Beyond 4, lift to the appropriate layer's context or pass a contract object.
4. **Server state ≠ client state.** Server state lives in the data layer (TanStack Query or repository hooks) and is never duplicated into client state. Local UI state (filters, selections) is client state.
5. **Workspace state never leaks to Global.** A second workspace mount must start clean; if data is genuinely cross-workspace, promote it to Global with an ADR.
6. **Workflow state is ephemeral.** When the flow unmounts, the state is gone. Persistence requires explicit save to the repository.

## Anti-patterns

- Storing form drafts in Global context.
- Using a single mega-context for unrelated workspaces.
- Setting state in a parent from a deeply nested child via `useEffect`.
- Mirroring server state into Redux/Zustand "for convenience".

## Enforcement

- Code review against this document.
- `UI_PERFORMANCE_BUDGET.md` prop-depth and context fan-out limits.
- Future fitness function (UX-2+) can detect deeply nested setState calls.
