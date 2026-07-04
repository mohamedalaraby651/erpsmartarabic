# UX3A — Frontend Platform Reference Architecture

- **Status:** LOCKED (immutable; changes via ADR amendment only)
- **Version:** 1.0.0
- **Locked-At:** 2026-07-04
- **Locked-By:** BASELINE-UX3A-000
- **Owner:** Architecture Council
- **Companion ADR:** [ADR-0014 — Frontend Platform Charter](../../adr/0014-frontend-platform-charter.md)
- **Companion rules:** [DEPENDENCY_RULES.md](../DEPENDENCY_RULES.md)
- **Baseline seal:** `BASELINE-UX3A-000` (Wave 0), `BASELINE-UX3A-001` (Wave 1)
- **Applies to:** All frontend layers (`src/kernel`, `src/platform`, `src/ui`, `src/design-system`, `src/ux`, `src/ui-contracts`, `src/features/*`, `src/pages/*`).

**Change Protocol.** This document is immutable. Any amendment requires (a) a new ADR referencing UX3A-§n, (b) a bumped `Version:` header, (c) a new `Locked-By:` baseline tag, and (d) fitness-check updates that reference the changed invariants.

This document is the *specification*. Waves cite it by section ID (`UX3A-§n`). Deviations require ADR amendment.

---

## UX3A-§1 Scope & Non-Goals

**In-scope.** Layering rules, platform runtime, kernel contracts, design system, UX framework, UI contracts taxonomy, module manifest, dashboard runtime, intelligence reservation, performance governance, staged execution plan (Waves 0 → 6.99).

**Out-of-scope.** Feature pages, business workflows, backend schema, deployment topology.

**Non-goals.** Introducing new runtime dependencies without an ADR; direct feature/page work before Wave 6.5.

---

## UX3A-§2 Layered Model

```text
Platform → Kernel → Runtime → Design System → UX Framework → Feature Modules → Pages
```

**Invariants (fitness-enforced):**

1. No back-edges. A lower layer never imports an upper layer.
2. `ux/**` bans imports from `domain/**`, `application/**`, `infrastructure/**`, `integrations/supabase/**`.
3. `kernel/**` is pure: no React, no DOM, no network, no Supabase.
4. Feature modules consume only public façades: `@/platform`, `@/kernel`, `@/design-system`, `@/ux`, `@/ui-contracts`.
5. `design-system/**` bans imports from `ux/**`, `platform/**`, `features/**`, `pages/**`.
6. No new runtime dependency without an accepted ADR.

---

## UX3A-§3 Target Directory Layout

```text
src/
├── kernel/
│   ├── identity/  clock/  culture/  i18n/  env/  flags/  tenant/  permissions/
│   └── index.ts
├── platform/
│   ├── core/
│   ├── runtime/
│   │   ├── bootstrap/  startup/  shutdown/  hydration/  recovery/
│   │   └── RuntimeLifecycle.ts
│   ├── ports/                       # NotificationPort, DialogPort, NavigationPort,
│   │                                #   StoragePort, ClipboardPort, FilePickerPort, SharePort
│   ├── providers/
│   ├── registries/                  # SlotRegistry, ShortcutRegistry index
│   ├── services/                    # LoggerPort binding, ToastService
│   ├── shell/                       # adapter over src/ui/AppShell
│   ├── navigation/                  # Registry + Breadcrumb/Menu/Permission resolvers
│   ├── workspaces/                  # Registry / Loader / Slots / Lifecycle / Context
│   ├── modules/                     # ModuleRegistry, ModuleLoader, ModuleManifest (Zod)
│   ├── commands/                    # CommandRegistry, CommandBus, CommandHandler
│   ├── events/                      # UIEvent, EventRegistry, Publisher, Subscriber
│   ├── shortcuts/                   # global bootstrap
│   ├── command-palette/             # wired to CommandBus + intelligence.commands
│   ├── notifications/               # NotificationProvider (uses NotificationPort)
│   ├── dashboard/
│   │   ├── widget-runtime/  layout-engine/  persistence/
│   │   └── index.ts
│   ├── plugins/                     # plugin contract (Marketplace-ready)
│   ├── intelligence/
│   │   ├── commands/ agents/ prompts/ slots/ actions/ providers/ context/ memory/
│   │   └── index.ts
│   └── index.ts
├── ui/                              # (unchanged) tokens/primitives/composites/shell
├── design-system/
│   ├── tokens/ primitives/ composites/ patterns/  └── index.ts
├── ux/
│   ├── interactions/ state/ presentation/ dashboard/  └── index.ts
├── ui-contracts/
│   ├── view/          # per feature, e.g. finance/invoice.ts
│   ├── interaction/
│   ├── widget/
│   ├── module/
│   ├── _mocks/
│   └── index.ts
└── pages/design-system/             # dev/staging only, code-split out of prod
```

---

## UX3A-§4 Runtime Lifecycle (Refinement R1)

`platform/runtime/` implements a single `RuntimeLifecycle` contract with 5 phases: **bootstrap → startup → hydration → shutdown → recovery**.

- **bootstrap.** Load env, feature flags, tenant/identity from persistence.
- **startup.** Initialize Ports (§5), Registries (§7), CommandBus, EventBus, ModuleRegistry.
- **hydration.** Rehydrate workspace context, dashboard layouts, saved views.
- **shutdown.** Flush pending outbox/commands, unsubscribe listeners, tear down Ports.
- **recovery.** Detect and repair partial state (crash recovery, quota errors, session-expiry).

Contract:
```ts
export interface RuntimeLifecycle {
  bootstrap(ctx: BootContext): Promise<void>;
  startup(ctx: RuntimeContext): Promise<void>;
  hydrate(ctx: RuntimeContext): Promise<void>;
  shutdown(reason: ShutdownReason): Promise<void>;
  recover(fault: RuntimeFault): Promise<RecoveryOutcome>;
}
```

Fitness: `check-runtime-lifecycle.mjs` — every `platform/runtime/*` file must export via one of the 5 phase folders; `RuntimeLifecycle` must have exactly one composition-root binding.

---

## UX3A-§5 Frontend Ports (Refinement R2)

7 ports, each with (a) a pure interface, (b) a browser adapter, (c) an in-memory test adapter. No feature imports adapters directly — only `@/platform` façades resolve the active adapter.

| Port | Purpose |
|---|---|
| `NotificationPort` | Toasts, banners, system notifications |
| `DialogPort` | Modal confirm/alert/prompt |
| `NavigationPort` | Route push/replace/back with intent metadata |
| `StoragePort` | Local/session/persistent KV with quota awareness |
| `ClipboardPort` | Read/write clipboard with permission fallback |
| `FilePickerPort` | Open/save file dialogs |
| `SharePort` | Web Share / copy-link fallback |

Fitness: `check-frontend-ports-usage.mjs` — features import ports only via `@/platform/ports`; adapters live only under `platform/ports/adapters/**`.

---

## UX3A-§6 Module Manifest (Refinement R3)

Zod-validated at registration:
```ts
export interface ModuleManifest {
  id: string;                        // "finance.invoice"
  version: string;                   // semver
  dependencies: string[];            // other module ids
  routes: RouteDescriptor[];
  commands: CommandDescriptor[];
  navigation: NavigationEntry[];
  permissions: PermissionSpec[];
  featureFlags: FlagSpec[];
  widgets: WidgetDescriptor[];
  intelligenceExtensions: IntelligenceExtension[];
}
```

Fitness: `check-module-manifest.mjs` — every registered module ships a manifest that parses; duplicate `id` or missing dependency fails the build.

---

## UX3A-§7 Registries

- **SlotRegistry** — named UI slots addressable by `slotId` (namespaced, e.g. `intelligence.panel.right`).
- **ShortcutRegistry** — keyboard shortcuts with scope + priority.
- **NavigationRegistry** — hierarchy + resolvers (Breadcrumb/Menu/Permission).
- **CommandRegistry** — commands with descriptors: id, title, scope, permissions, invoke.
- **EventRegistry** — typed UI events + subscribers.
- **ModuleRegistry** — see §6.
- **WorkspaceRegistry** — workspace descriptors with lifecycle hooks.
- **WidgetRegistry** — dashboard widgets (see §10).

**Reserved intelligence slots (permanent, empty until Intelligence wave):** `intelligence.panel.right`, `intelligence.command.scope`, `intelligence.topbar.trigger`, `intelligence.workspace.footer`. Enforced by `check-intelligence-slot-reservation.mjs`.

---

## UX3A-§8 UX State Metadata (Refinement R5)

11-state discriminated union. Every state carries metadata:
```ts
interface UIStateMetadata {
  reason?: string;                   // machine code, not UI copy
  updatedAt: string;                 // ISO instant
  retryable: boolean;
  userMessageKey?: string;           // i18n key, resolved by view
  correlationId?: string;
}
```

States: `idle | loading | hydrating | empty | filtered-empty | partial | ready | stale | error | offline | unauthorized`.

`<UIStateView state={...} />` is the sole render entry point. Fitness: `check-ui-state-metadata.mjs` bans ad-hoc `if (loading) return …` outside `<UIStateView/>`.

---

## UX3A-§9 Data Presentation Framework

`PresentationView<TRow>` sits over `DataGridContract`; adapters: Grid, Card, Kanban, Timeline, Tree, Calendar, Pivot, Chart. All read via UI contracts (never domain/query directly).

---

## UX3A-§10 Dashboard Runtime — Split (Refinement R6)

Three independent modules behind ports:

- `platform/dashboard/widget-runtime/` — widget lifecycle, isolation, error boundary.
- `platform/dashboard/layout-engine/` — grid math, drag/resize algorithms (engine-agnostic).
- `platform/dashboard/persistence/` — layout & preferences storage (uses `StoragePort`).

`ux/dashboard/` renders UI shells that consume the 3 modules via `@/platform/dashboard`. Adding a runtime dep (e.g. `react-grid-layout`) requires ADR-0021 amendment. Fitness: `check-dashboard-module-split.mjs`.

---

## UX3A-§11 UI Contracts Taxonomy (Refinement R7)

```text
src/ui-contracts/
├── view/          # read-shape contracts feature UIs consume
├── interaction/   # command/flow contracts for user actions
├── widget/        # dashboard-widget contracts
├── module/        # cross-module surface contracts
└── _mocks/        # deterministic fixtures per contract
```

Fitness: `check-ui-contract-taxonomy.mjs` — files under `ui-contracts/` must live in one of the 4 categories; `_mocks/` mirrors the same taxonomy.

---

## UX3A-§12 Performance Governance (Refinement R8)

See `UI_PERFORMANCE_BUDGET.md §8` (added this wave) for numeric ceilings. Ceilings covered:

- Per-route JS gzip ceiling.
- TTFB / TTI per route.
- Skeleton-visible time (min & max window).
- Command execution p95.
- Bundle delta vs previous baseline.

Fitness: `check-bundle-budget.mjs` (per-route), `check-virtualization.mjs`, `check-heavy-components.mjs`, `check-rerender-guards.mjs`.

---

## UX3A-§13 Governance Artefacts

- **ADRs:** 0014 Charter · 0015 Kernel Contracts · 0016 Command Bus & Events · 0017 Navigation Runtime · 0018 Workspaces & Module Registry · 0019 UX State (+ metadata) · 0020 Data Presentation · 0021 Dashboard Runtime (split) · 0022 Intelligence Reservation · 0023 Runtime Lifecycle · 0024 Frontend Ports · 0025 Performance Governance.
- **Baselines:** `BASELINE-UX3A-000` (this seal) → `BASELINE-UX3A-001` (Wave 6.99 exit).
- **Layer map:** `docs/architecture/UI_LAYER_MAP.md`.
- **Manifest:** `docs/architecture/MANIFEST.json` (updated per wave).
- **Project map:** `PROJECT_MAP.md` (updated per wave).

---

## UX3A-§14 Staged Execution — Wave Charter

Every wave delivers: (a) code, (b) tests, (c) fitness activation, (d) ADR promotion, (e) `PROJECT_MAP.md` + `MANIFEST.json` update, (f) wave lock JSON, (g) baseline tag entry. Stop condition: all activated fitness checks green in CI **and** wave lock file present.

| Wave | Title | ADRs promoted |
|---|---|---|
| 0 | Reference doc + Governance seed | 0014 Draft |
| 1 | Kernel + Platform skeleton + Runtime Lifecycle + Ports | 0015, 0023, 0024 |
| 2 | Design System consolidation | 0003 amendment |
| 3 | Runtime: CommandBus + Events + Navigation + Modules + Workspaces | 0016, 0017, 0018 |
| 4 | Interaction Framework | — |
| 5 | UX State System + Metadata | 0019 |
| 6 | Data Presentation Framework | 0020 |
| 6.3 | Dashboard Runtime (split) | 0021 |
| 6.5 | UI Contracts taxonomy + Demo routes | 0004 amendment |
| 6.9 | Performance UX pass | 0025 |
| 6.99 | Exit Gate | 0014–0025 → Accepted |

**Design-system demo routes** (`/design-system/*`) live under `pages/design-system/**`, gated `import.meta.env.DEV || VITE_ENABLE_DESIGN_SYSTEM === 'true'`, and are code-split out of the production bundle.

---

## UX3A-§15 Forbidden Modifications (this reference doc)

Once sealed, this file is immutable. Corrections require:

1. Open ADR amendment referencing the impacted section IDs.
2. Bump the reference doc `Version:` header on merge.
3. Re-seal a new baseline (`BASELINE-UX3A-<next>`).
