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

---

## §8 Performance Governance (UX3A-§12)

Added by UX3A Wave 0. Governs the Frontend Platform (`kernel/`, `platform/`, `design-system/`, `ux/`, `ui-contracts/`, `features/*`, `pages/*`). Enforced by CI fitness checks starting Wave 6.5 (`check-bundle-budget.mjs`) and Wave 6.9 (`check-virtualization.mjs`, `check-heavy-components.mjs`, `check-rerender-guards.mjs`).

### 8.1 Per-Route Bundle Ceiling (gzip)

| Route class | Ceiling | Hard fail |
|---|---|---|
| Shell entry (root chunk) | 180 KB | 220 KB |
| Feature route (typical) | 120 KB | 180 KB |
| Feature route (data-heavy: grid/dashboard) | 180 KB | 250 KB |
| `/design-system/*` demo route | n/a in prod | must be tree-shaken to 0 KB in prod |

### 8.2 Route Timing Budgets

| Signal | Target (cable) | Target (Slow 4G) | Measured by |
|---|---|---|---|
| TTFB (Vite dev / static host) | ≤ 100 ms | ≤ 400 ms | Performance API `responseStart` |
| First Contentful Paint | ≤ 1.0 s | ≤ 2.5 s | web-vitals |
| Time to Interactive | ≤ 1.8 s | ≤ 4.0 s | web-vitals |
| Skeleton visible (min) | ≥ 150 ms | ≥ 150 ms | Prevents flash — enforced by `<Deferred/>` |
| Skeleton visible (max) | ≤ 1200 ms | ≤ 3000 ms | Otherwise switch to `partial` UI state |

### 8.3 Command Execution (CommandBus)

| Signal | p50 | p95 | p99 |
|---|---|---|---|
| Local command (no I/O) | ≤ 8 ms | ≤ 20 ms | ≤ 40 ms |
| Command dispatching to handler | ≤ 4 ms | ≤ 10 ms | ≤ 20 ms |
| Optimistic UI resolve | ≤ 16 ms | ≤ 32 ms | ≤ 64 ms |
| Remote command round-trip | ≤ 300 ms | ≤ 800 ms | ≤ 1500 ms |

### 8.4 Bundle Delta vs Previous Baseline

Every wave's baseline JSON records total-bundle SHA + gzip size. A wave PR fails CI when total gzip grows > 5% versus the previous baseline unless the wave's ADR explicitly waives it with a written justification.

### 8.5 Governance Rules

- Any component rendering a list of > 100 rows **must** use virtualization (`check-virtualization`).
- Heavy modules (charts, editors, PDF, DnD) **must** be lazy-loaded per route (`check-heavy-components`).
- Context providers whose value changes on every render **must** be memoized (`check-rerender-guards`).
- Adding a runtime dep > 30 KB gzip requires an ADR amendment naming a removed dep or a waiver justification.
