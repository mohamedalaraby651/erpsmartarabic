## UX-3A — Frontend Platform Reference Architecture + Staged Execution

Adopts your 8 refinements. First deliverable is a **reference specification document** (immutable, versioned). Subsequent waves execute one-at-a-time; each wave gets its own scoped prompt derived from the reference doc (allowed files, forbidden files, success criteria, fitness checks, stop condition).

### Refinements folded into the architecture

1. **Runtime Lifecycle** — `platform/runtime/{bootstrap,startup,shutdown,hydration,recovery}` with a single `RuntimeLifecycle` contract.
2. **Frontend Ports** — `platform/ports/{Notification,Dialog,Navigation,Storage,Clipboard,FilePicker,Share}Port.ts` + default browser adapters + in-memory test adapters.
3. **Rich Module Manifest** — `{ id, version, dependencies[], routes[], commands[], navigation[], permissions[], featureFlags[], widgets[], intelligenceExtensions[] }` with a Zod schema + `check-module-manifest.mjs`.
4. **Intelligence Layer** — add `context/`, `memory/`, `providers/` alongside `commands/agents/prompts/slots/actions/`.
5. **UX State Metadata** — every state carries `{ reason?, updatedAt, retryable, userMessageKey?, correlationId? }`; `<UIStateView/>` reads it uniformly.
6. **Dashboard split** — `platform/dashboard/{widget-runtime,layout-engine,persistence}` as three independent modules behind ports.
7. **Contracts taxonomy** — `src/ui-contracts/{view,interaction,widget,module}/` with per-category fitness checks.
8. **Performance Governance** — extend `docs/architecture/UI_PERFORMANCE_BUDGET.md` with per-route bundle ceiling, TTFB, skeleton-visible time, command-execution p95, and wire `check-bundle-budget.mjs` per route.

### Layered model (locked, unchanged from prior revision)

```text
Platform → Kernel → Runtime → Design System → UX Framework → Feature Modules → Pages
```

Hard rules (fitness-enforced): no back-edges; `ux/**` bans domain/app/infra/supabase; feature modules consume only public façades (`@/platform`, `@/kernel`, `@/design-system`, `@/ux`, `@/ui-contracts`); no new runtime dependency without an ADR.

### Target directory layout (final)

```text
src/
├── kernel/
│   ├── identity/  clock/  culture/  i18n/  env/  flags/  tenant/  permissions/
│   └── index.ts
├── platform/
│   ├── core/                       # PlatformProvider composition
│   ├── runtime/
│   │   ├── bootstrap/  startup/  shutdown/  hydration/  recovery/
│   │   └── RuntimeLifecycle.ts
│   ├── ports/                      # NotificationPort, DialogPort, NavigationPort,
│   │                               #   StoragePort, ClipboardPort, FilePickerPort, SharePort
│   ├── providers/                  # thin composition
│   ├── registries/                 # SlotRegistry, ShortcutRegistry index
│   ├── services/                   # LoggerPort binding, ToastService
│   ├── shell/                      # adapter over src/ui/AppShell
│   ├── navigation/                 # Registry + Resolvers (Breadcrumb/Menu/Permission)
│   ├── workspaces/                 # Registry/Loader/Slots/Lifecycle/Context
│   ├── modules/                    # ModuleRegistry, ModuleLoader, ModuleManifest (Zod)
│   ├── commands/                   # CommandRegistry, CommandBus, CommandHandler
│   ├── events/                     # UIEvent, EventRegistry, Publisher, Subscriber
│   ├── shortcuts/                  # global bootstrap
│   ├── command-palette/            # wired to CommandBus + intelligence.commands
│   ├── notifications/              # NotificationProvider (uses NotificationPort)
│   ├── dashboard/
│   │   ├── widget-runtime/  layout-engine/  persistence/
│   │   └── index.ts
│   ├── plugins/                    # plugin contract (Marketplace-ready)
│   ├── intelligence/
│   │   ├── commands/ agents/ prompts/ slots/ actions/ providers/ context/ memory/
│   │   └── index.ts
│   └── index.ts
├── ui/                             # (unchanged tokens/primitives/composites/shell)
├── design-system/
│   ├── tokens/ primitives/ composites/ patterns/  └── index.ts
├── ux/
│   ├── interactions/ state/ presentation/ dashboard/  └── index.ts
├── ui-contracts/
│   ├── view/       # e.g. finance/invoice.ts
│   ├── interaction/
│   ├── widget/
│   ├── module/
│   ├── _mocks/
│   └── index.ts
└── pages/design-system/            # dev/staging only, code-split out of prod
```

### Governance additions

**Reference doc (immutable, versioned):** `docs/architecture/reference/UX3A-FRONTEND-PLATFORM.md` (this document, verbatim, with per-section IDs `UX3A-§1..§12`). Any deviation requires an ADR amendment.

**ADRs (Draft → Accepted per wave):** 0014 Charter · 0015 Kernel Contracts · 0016 Command Bus & Events · 0017 Navigation Runtime · 0018 Workspaces & Module Registry · 0019 UX State (+ metadata) · 0020 Data Presentation · 0021 Dashboard Runtime (widget/layout/persistence split) · 0022 Intelligence Reservation · **0023 Runtime Lifecycle** · **0024 Frontend Ports** · **0025 Performance Governance**.

**New fitness checks:** `check-platform-layering`, `check-kernel-purity`, `check-ux-purity`, `check-design-system-purity`, `check-command-bus-usage`, `check-navigation-registry`, `check-module-manifest`, `check-runtime-lifecycle`, `check-frontend-ports-usage`, `check-intelligence-slot-reservation`, `check-ui-state-metadata`, `check-dashboard-module-split`, `check-ui-contract-taxonomy`, `check-no-hardcoded-colors`, `check-legacy-shell-retirement`, `check-legacy-ui-kit-retirement`, `check-bundle-budget`, `check-virtualization`, `check-heavy-components`, `check-rerender-guards`.

**Docs:** `UI_LAYER_MAP.md`, extend `UI_PERFORMANCE_BUDGET.md` per §8, `PROJECT_MAP.md` update per wave, `MANIFEST.json` update per wave.

### Open question resolution
`/design-system/*` demo routes: dev/staging only, gated by `import.meta.env.DEV || VITE_ENABLE_DESIGN_SYSTEM === 'true'`, code-split out of the production bundle.

---

### Staged execution — one wave per turn, each with its own scoped prompt

Every wave delivers: (a) code, (b) tests, (c) fitness activation, (d) ADR promotion, (e) `PROJECT_MAP.md` + `MANIFEST.json` update, (f) wave lock JSON, (g) baseline tag entry. The stop condition for every wave is: all activated fitness checks green in CI **and** wave lock file present.

- **Wave 0 — Reference doc + Governance seed** *(no `src/**` changes)*
  Files allowed: `docs/architecture/reference/UX3A-FRONTEND-PLATFORM.md` (new, this plan verbatim + section IDs), `docs/architecture/UI_LAYER_MAP.md` (new skeleton), `docs/adr/0014-frontend-platform-charter.md` (Draft), extend `docs/architecture/UI_PERFORMANCE_BUDGET.md`, seal `BASELINE-UX3A-000` via `build-baseline-tag.mjs`, add `check-platform-layering.mjs` in **report-only** mode, register in `run-all.mjs`. Forbidden: any file under `src/**`. Success: baseline JSON present, ADR-0014 Draft merged, layering report emitted with 0 violations expected (informational).

- **Wave 1 — Kernel + Platform skeletons + Runtime Lifecycle + Ports** *(ADR-0015, ADR-0023, ADR-0024)*
  Create `src/kernel/**`, `src/platform/core|runtime|ports|providers|registries|services|shell/**` with public façades; wire `platform/shell` to `src/ui/AppShell`; migrate `AppLayout` off `AdaptiveShell` (mobile bottom-nav + FAB preserved via slot registrations); implement `RuntimeLifecycle` (bootstrap/startup/hydration/shutdown/recovery); ship 7 Ports + browser + in-memory adapters. Activate: `check-kernel-purity`, `check-platform-layering` (enforcing), `check-runtime-lifecycle`, `check-frontend-ports-usage`, `check-legacy-shell-retirement`.

- **Wave 2 — Design System consolidation** *(ADR update to 0003)*
  Fill token gaps (`surface-*`, `elevation-*`, `radius-*`, `motion-*`, `z-*`, status tones), add high-contrast theme, migrate callers off `components/ui-kit/*`, delete `ui-kit`. Activate: `check-design-system-purity`, `check-no-hardcoded-colors`, `check-legacy-ui-kit-retirement`.

- **Wave 3 — Runtime: CommandBus + Events + Navigation + Modules + Workspaces** *(ADRs 0016, 0017, 0018)*
  Implement the five runtime subsystems; ship a rich `ModuleManifest` Zod schema; onboard a **pilot Finance/Invoice UI module** end-to-end through the registries (stubbed handlers). Activate: `check-command-bus-usage`, `check-navigation-registry`, `check-module-manifest`.

- **Wave 4 — Interaction Framework** *(`src/ux/interactions`)*
  Create/Edit/Delete/Confirm/Bulk/Wizard/Search/Filter/ImportExport flows with cancellation tokens + idempotency keys + `useFlow()`; every flow dispatches via CommandBus; demo routes under `/design-system/interactions/*`.

- **Wave 5 — UX State System + Metadata** *(ADR-0019)*
  11-state discriminated union with metadata `{ reason?, updatedAt, retryable, userMessageKey?, correlationId? }`; `<UIStateView/>`; codemod audit of existing empty/error/loading usages. Activate: `check-ui-state-metadata`.

- **Wave 6 — Data Presentation Framework** *(ADR-0020)*
  Shared `PresentationView<TRow>` over `DataGridContract`; adapters for Grid/Card/Kanban/Timeline/Tree/Calendar/Pivot/Chart.

- **Wave 6.3 — Dashboard Runtime (split)** *(ADR-0021)*
  `platform/dashboard/{widget-runtime,layout-engine,persistence}` as three modules behind ports; `ux/dashboard` UI shells. Any new runtime dep (e.g. `react-grid-layout`) justified inline in ADR-0021. Activate: `check-dashboard-module-split`.

- **Wave 6.5 — UI Contracts taxonomy + Demo routes** *(ADR-0004 amendment)*
  `src/ui-contracts/{view,interaction,widget,module}/` + `_mocks/`; `/design-system/*` gated dev/staging + code-split. Activate: `check-ui-contract-taxonomy`, `check-bundle-budget`.

- **Wave 6.9 — Performance UX pass** *(ADR-0025)*
  Skeleton timing, `<Deferred/>`/`<Prioritized/>`, route lazy audit, sidebar-hover prefetch, optimistic UI helpers, mandatory virtualization for lists >100, image strategy. Activate: `check-virtualization`, `check-heavy-components`, `check-rerender-guards`.

- **Wave 6.99 — Exit Gate**
  All fitness green in CI, ≥90% branch coverage on Kernel + Runtime + Interaction/State/Dashboard frameworks, Playwright smoke (RTL, dark/high-contrast, keyboard through shell + palette + flows), ADRs 0014–0025 → **Accepted**, seal `BASELINE-UX3A-001` + `ux3a-lock.json`.

### What I will do this turn if approved
Execute **Wave 0 only**:
1. Write `docs/architecture/reference/UX3A-FRONTEND-PLATFORM.md` (this reference spec).
2. Create `docs/architecture/UI_LAYER_MAP.md` skeleton.
3. Draft `docs/adr/0014-frontend-platform-charter.md`.
4. Extend `docs/architecture/UI_PERFORMANCE_BUDGET.md` with §8 governance.
5. Seal `BASELINE-UX3A-000` using existing `build-baseline-tag.mjs`.
6. Add `check-platform-layering.mjs` (report-only) and wire into `run-all.mjs`.

No `src/**` file will be touched in Wave 0. I will pause for your review before Wave 1.

### Confirmations before Wave 1
1. Approve final directory names (`kernel/`, `platform/runtime`, `platform/ports`, `platform/intelligence`, `ux/`, `ui-contracts/{view,interaction,widget,module}`).
2. Approve migrating `AppLayout` off `AdaptiveShell` inside Wave 1.
3. Approve reserving intelligence slots now: `intelligence.panel.right`, `intelligence.command.scope`, `intelligence.topbar.trigger`, `intelligence.workspace.footer`.
