# UI Performance Budget

**Status:** Active (UX-1, Wave 0)
**Applies to:** `src/ui/**`, `src/workspaces/**`

## Render Budgets

| Metric | Budget | Measured by |
|---|---|---|
| Component render time (p95) | ≤ 16 ms | React Profiler in dev; manual sampling in POC |
| Workspace shell mount (cold) | ≤ 250 ms | Performance API marker `workspace-shell-ready` |
| Workspace shell mount (warm) | ≤ 80 ms | same marker |
| Route transition (intra-workspace) | ≤ 150 ms | Performance API marker `route-ready` |
| Time to first interaction in POC route | ≤ 1.5 s on cable, ≤ 3.5 s on Slow 4G | Browser performance trace |
| Sidebar render (p95) | ≤ 3 ms | React Profiler |
| Workspace switch | ≤ 20 ms | `workspace:changed` event timestamp |
| Command palette search (1 000 commands) | ≤ 30 ms | Manual perf trace |

## Architectural Budgets

| Rule | Limit | Rationale |
|---|---|---|
| Prop depth (drilling) | ≤ 4 levels | Beyond 4 → use context or a contract |
| Context fan-out | ≤ 1 context update per user interaction per workspace | Avoid cascade renders |
| Provider nesting per route | ≤ 6 providers | Mount cost + readability |
| Component file size | ≤ 300 LOC | Split or extract hook |
| Component cyclomatic complexity | ≤ 15 | Split conditional branches |
| Re-render count per typed character | ≤ 2 in the owning input subtree, 0 elsewhere | Memoize boundaries |

## Memoization Rules

1. Memoize a component (`React.memo`) only when (a) it is rendered in a list of ≥ 20 items, or (b) its parent re-renders ≥ 4× per interaction.
2. `useMemo` / `useCallback` for values passed to memoized children or to context providers — never as a default reflex.
3. Stable identity for context values: always `useMemo` the provider `value` prop.
4. Selectors over context: when a context has multiple unrelated fields, split it into multiple contexts.

## Bundle Budgets (per wave)

| Scope | Delta vs UX-0 baseline (4.7 MB) |
|---|---|
| Total | ±5% |
| Per workspace chunk | ≤ 250 KB gzipped, hard ceiling 400 KB |
| New contract module | 0 KB runtime (types only) |

## Enforcement

- React Profiler check in the Suppliers POC before UX-1E exit.
- `scripts/audits/bundle-report.mjs` deltas reviewed at every wave gate.
- Budget breach = scorecard Perf section fails → wave does not pass.
