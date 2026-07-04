## UX-3A Wave 1 — Kernel + Platform Skeleton + Runtime Lifecycle + Ports + Shell Migration (v3)

Incorporates the previous five refinements plus six new hardening items: Kernel browser-globals fitness, Architecture Drift Report, Architecture Fingerprint, `DEPENDENCY_RULES.md`, PortRegistry completeness fitness, and PlatformShell single-entry fitness.

---

### Wave 1 Architectural Invariants (authoritative — enforced by fitness + tests)

1. Platform never depends on UX.
2. Kernel never depends on Platform.
3. Ports never depend on their adapters — adapters depend on Ports; never the reverse.
4. `AppLayout` imports `PlatformShell` only.
5. `PlatformShell` is the single runtime entry point — **only** file allowed to instantiate `PlatformRuntime` or provide `RuntimeContext`.
6. Only public façades (`@/kernel`, `@/platform`, `@/platform/ports`, `@/platform/runtime`, `@/platform/shell`) are importable from outside.
7. Deep imports across layer boundaries are forbidden.
8. `PlatformRuntime` owns lifecycle.
9. Runtime owns Ports (single injection surface = `PortRegistry`, must contain **all** declared ports).
10. UI owns rendering only — no business logic in Platform or Kernel.
11. No business logic enters Platform or Kernel from Domain / Application / Infrastructure / Supabase.
12. Kernel is browser-globals-free — no `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `WebSocket`, `caches`, `IndexedDB`, `crypto` (browser), `location`, `history`.

---

### Phase G-W1 — Approval Gate (no `src/**` changes)

1. Stamp `docs/architecture/reference/UX3A-FRONTEND-PLATFORM.md` header: `Version: v1.0`, `Status: LOCKED`, `Locked-At: <date>`, `Locked-By: BASELINE-UX3A-000`. Add "Change Protocol" clause.
2. Append **Wave-1 Conditional Acceptance** clause to ADR-0014.
3. **New:** Create `docs/architecture/DEPENDENCY_RULES.md` — the canonical, human-readable specification of layer edges, façade whitelist, and the 12 invariants above. All fitness checks and ADRs reference this file by section id (e.g. `DR-§3.2/kernel-purity`).
4. Add `.github/workflows/ux3a-wave1-gate.yml` running: `bun run build`, the project's configured TypeScript type-check command (whichever `package.json` script exists — do not hardcode `tsgo`), `node scripts/fitness/run-all.mjs`, plus Wave 1 fitness checks and the Drift Report.
5. Update `PROJECT_MAP.md` and `docs/architecture/MANIFEST.json` to reference `BASELINE-UX3A-000` and the new `DEPENDENCY_RULES.md`.
6. Append ADR-conflict appendix to the reference doc mapping UX3A onto ADR-0002/0003/0004 (façade layering only; no override).

Stop: all six green, evidence under `scripts/audits/output/fitness/` and `scripts/audits/output/ux3a-drift/`.

---

### Phase M1..M7 — Execution

**Allowed writes:** `src/kernel/**`, `src/platform/**`, `src/components/layout/AppLayout.tsx` (single migration edit), new ADRs, new fitness checks, new tests, lock/baseline/drift/fingerprint JSON, `DEPENDENCY_RULES.md`.

**Forbidden writes:**
- `src/ui/**` (Design System is Wave 2's concern) — sole exception is composition inside `src/platform/shell/**` that *renders* existing `src/ui/**` components without modifying them.
- Command Bus, Event Bus, Navigation Runtime, Module Registry, UX State, Dashboard, Interaction Framework.
- AI/Intelligence beyond reserved slot name constants.
- Any new runtime dependency.

#### M1 — Kernel (`src/kernel/**`)
Pure. No React / DOM / network / Supabase / browser globals. Sub-modules and public façade `@/kernel`:
`identity/`, `clock/` (+ `SystemClock`, `FakeClock`), `culture/`, `i18n/` (`TranslationPort` + `InMemoryTranslator`), `env/`, `flags/` (`FeatureFlagPort` + `StaticFlagAdapter`), `tenant/`, `permissions/`. `index.ts` is the sole façade.

#### M2 — Platform skeleton (`src/platform/**`)
```text
src/platform/
├── runtime/          # M3
├── ports/            # M4
├── shell/            # M5
├── registries/       # reserved
├── modules/          # reserved
├── ai/               # reserved slot name constants only
└── index.ts          # public façade
```

#### M3 — Runtime Lifecycle (`src/platform/runtime/`)
`PlatformRuntime` with 5 phases: `bootstrap → startup → hydration → shutdown → recovery`. `RuntimeState` union: `idle | bootstrapping | starting | hydrating | ready | shutting-down | recovering | failed`.

**Lifecycle Invariants (dedicated tests):**
- `startup()` cannot execute before `bootstrap()`.
- `hydration()` executes at most once.
- `shutdown()` is idempotent.
- `recovery()` cannot transition directly to `ready`.
- `failed` is terminal.
- Deterministic: accepts injected `ClockPort`, `IdPort`, `FeatureFlagPort`, `TenantContext`, `Culture`, `PortRegistry`.
- No React inside `runtime/`. The Shell exposes `useRuntimePhase()`.

#### M4 — Frontend Ports (`src/platform/ports/`)
Seven ports; each has interface + Browser adapter + In-Memory adapter + tests.

| Port | Browser adapter | In-Memory adapter |
|---|---|---|
| `NotificationPort` | shadcn `toast` | array recorder |
| `DialogPort` | shadcn dialog wrapper | queue resolver |
| `NavigationPort` | wraps `useNavigate` | navigation recorder |
| `StoragePort` | `localStorage` + JSON codec | `Map<string,string>` |
| `ClipboardPort` | `navigator.clipboard` | in-memory buffer |
| `FilePickerPort` | hidden `<input type=file>` | fixture resolver |
| `SharePort` | `navigator.share` + clipboard fallback | payload recorder |

Directory rule (invariant #3): interfaces live at `src/platform/ports/`; adapters live at `src/platform/ports/adapters/{browser,memory}/`. Ports must **not** import from `adapters/**`.

`PortRegistry` is the single injection surface, exposed via `PortRegistry.default()` and `PortRegistry.inMemory()`. It exports a `DECLARED_PORTS` const enumerating every port name — used by fitness (M7) to prove completeness.

#### M5 — Shell façade & AppLayout migration
- Create `src/platform/shell/PlatformShell.tsx`. It is the **only** file that constructs `PlatformRuntime`, publishes `RuntimeContext`, and renders the existing `src/ui/layout/AppShell` plus legacy chrome (`AppSidebar`, `AppHeader`, `MobileHeader`, `MobileBottomNav`, `MobileDrawer`, `FABMenu`, `PageErrorBoundary`, `PageTransition`, `ShortcutsModal`, `CommandBar`, `EnvironmentBadge`) through composition. `src/ui/**` unchanged.
- **Behavioral Parity (hard exit criterion):** no visible UI regression, no keyboard-shortcut regression, no mobile navigation regression, no RTL regression, no accessibility regression. Verified via: parity structural snapshot, keyboard-shortcut integration test, mobile viewport render test, RTL render test, axe/a11y smoke test.
- Update `src/components/layout/AppLayout.tsx` to render `PlatformShell`. Keep `AdaptiveShell.tsx` in place with a deprecation banner; a fitness rule forbids **new** imports.

#### M6 — Façades, ADRs, Baseline, Fingerprint, Lock, Drift Report

**Public façades:** `@/kernel`, `@/platform`, `@/platform/ports`, `@/platform/runtime`, `@/platform/shell`.

**ADRs promoted to Accepted:**
- `docs/adr/0015-kernel-purity.md` (references `DEPENDENCY_RULES.md §Kernel`).
- `docs/adr/0023-frontend-ports-taxonomy.md` (parity + no-reverse-import rule).
- `docs/adr/0024-runtime-lifecycle.md` (5-phase model + lifecycle invariants).

**New artifacts:**
- **Architecture Drift Report** (`scripts/audits/architecture-drift-report.mjs` → `scripts/audits/output/ux3a-drift/wave1.json` + `.md`). Diffs the current layer graph (files per layer, cross-layer edges, façade usage, forbidden-import counts) against `BASELINE-UX3A-000` and against a post-Wave-1 snapshot. Fails CI on any un-approved delta.
- **Architecture Fingerprint** — `build-baseline-tag.mjs` extended to emit a top-level `fingerprint` field: `sha256` of the sorted `{layer → [publicFaçadeFile, ...]}` map plus the invariants list. Written into `BASELINE-UX3A-001` and also mirrored to `scripts/audits/output/architecture-fingerprint.json` for quick comparison across runs.
- `PROJECT_MAP.md` and `docs/architecture/UI_LAYER_MAP.md` populated (`kernel/`, `platform/` blocks).
- `scripts/audits/output/ux3a-wave1-lock.json` (ADR SHAs, port parity, layering report, drift diff, fingerprint, build/test hashes).
- `docs/architecture/baseline/BASELINE-UX3A-001.md` + `scripts/audits/output/baseline-ux3a-001.json`.

#### M7 — Fitness Checks (new/updated)

| Check | File | Invariants | Mode |
|---|---|---|---|
| `check-platform-layering` | existing | #1, #2, #6, #7, #11 | flipped **enforcing** |
| `check-port-adapter-parity` | new | #3 | enforcing |
| `check-kernel-browser-globals` | **new** — bans `window`/`document`/`navigator`/`localStorage`/`sessionStorage`/`fetch`/`XMLHttpRequest`/`WebSocket`/`caches`/`indexedDB`/`crypto`/`location`/`history` identifiers and matching `globalThis.*` accesses inside `src/kernel/**` | #12 | enforcing |
| `check-port-registry-completeness` | **new** — parses `DECLARED_PORTS` and asserts every listed port has: interface file, browser adapter, memory adapter, and registration in both `PortRegistry.default()` and `PortRegistry.inMemory()` | #9 | enforcing |
| `check-platform-shell-single-entry` | **new** — asserts `new PlatformRuntime(` and `RuntimeContext.Provider` appear only inside `src/platform/shell/**` | #5, #8 | enforcing |
| `check-no-new-adaptiveshell-imports` | new | #4, #5 | enforcing |
| `check-no-deep-imports` | extended | #6, #7 | enforcing |
| `check-baseline-tag-integrity` | existing | fingerprint | enforcing |
| Runtime lifecycle unit tests | new | #8 | test |
| Shell parity tests | new | #5, #10 | test |

All new checks wired into `scripts/fitness/run-all.mjs`.

---

### Exit Criteria (auto-verified in `ux3a-wave1-gate.yml`)

- `bun run build` green.
- Project's configured TypeScript type-check command green.
- `node scripts/fitness/run-all.mjs` green — including all 5 new/flipped checks above.
- All 12 Wave 1 Architectural Invariants covered by a check or test.
- Zero imports from `@/domain/**`, `@/application/**`, `@/infrastructure/**`, `@/integrations/supabase/**`, `@/ux/**` inside `src/kernel/**` or `src/platform/**`.
- Zero browser globals in `src/kernel/**`.
- Every declared port has both adapters and is present in both `PortRegistry` factories.
- `PlatformRuntime` constructor and `RuntimeContext.Provider` referenced only from `src/platform/shell/**`.
- `AppLayout.tsx` imports `@/platform/shell` only; no other file imports `AdaptiveShell`.
- Behavioral Parity tests green.
- `src/ui/**` git diff empty.
- `DEPENDENCY_RULES.md`, `PROJECT_MAP.md`, `MANIFEST.json`, `UI_LAYER_MAP.md`, reference doc header updated.
- ADRs 0015 / 0023 / 0024 = `Accepted`.
- `ux3a-wave1-lock.json`, `BASELINE-UX3A-001` (with `fingerprint`), and `ux3a-drift/wave1.json` sealed and integrity-verified.

---

### Post-Wave Stop — Architecture Audit (before any Wave 2 work)

- Re-run all fitness checks against the sealed baseline.
- Verify the Architecture Fingerprint matches the sealed value.
- Publish `AUDIT-WAVE1.md` summarizing: kernel purity, platform purity, port completeness, shell single-entry proof, drift diff vs `BASELINE-UX3A-000`, and any residual risks.
- Only after audit sign-off does Wave 2 (Design System consolidation) begin.

---

### Deliverables checklist

- [ ] G-W1 gate artifacts (reference lock header, ADR-0014 conditional clause, CI workflow using project's typecheck script, MANIFEST/PROJECT_MAP updates, `DEPENDENCY_RULES.md`, ADR conflict appendix).
- [ ] `src/kernel/**` with 8 sub-modules + `@/kernel` façade + unit tests + browser-globals fitness green.
- [ ] `src/platform/runtime/` with `PlatformRuntime` + 5 lifecycle invariant tests.
- [ ] `src/platform/ports/` with 7 ports × 2 adapters + parity fitness + registry-completeness fitness.
- [ ] `src/platform/shell/PlatformShell.tsx` with behavioral-parity test suite + single-entry fitness.
- [ ] `AppLayout.tsx` migrated; `AdaptiveShell.tsx` deprecated; `src/ui/**` unchanged.
- [ ] 5 new fitness checks + `check-platform-layering` flipped to enforcing.
- [ ] Architecture Drift Report generator + Wave 1 diff.
- [ ] Architecture Fingerprint embedded in `BASELINE-UX3A-001` and mirrored file.
- [ ] ADRs 0015 / 0023 / 0024 Accepted.
- [ ] `ux3a-wave1-lock.json` + `BASELINE-UX3A-001` sealed.
- [ ] `AUDIT-WAVE1.md` prepared as the mandatory pre-Wave-2 stop.
