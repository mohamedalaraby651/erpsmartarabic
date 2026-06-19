# UX-1 — Foundation (LOCKED FOR EXECUTION, v3)

> **Baseline:** `architecture-baseline-ux0`.
> **Mandate:** build the **ERP UI Operating System**; Finance = first production Workspace (UX-3); Suppliers = UX-1 technical POC.
> **Non-negotiables:** Vitest ≥ 1187 · `tsc --noEmit` = 0 · no new direct DB hits in UI · no migrations · no runtime deps without ADR.
> **v3 additions:** ADR Registry · Token Versioning · Canonical Lifecycle · Workspace Certification · Architecture Fitness Functions · graduated lint enforcement (warn → CI warning → blocking).

## Anchor to UX-0 evidence

| Signal | Baseline | UX-1 action |
|---|---:|---|
| UI direct DB | 150 | freeze + ESLint warn + fitness check; structural fix UX-2 |
| `as any` infra+ui | 63 | warn now; ≤ 30 by end of UX-1 |
| `console.*` leftover | 32 | remove in UX-1A |
| Circular deps | 6 | keep ≤ 6 |
| Bundle | 4.7 MB | ±5% per wave |
| MI / CC p95 | 90.19 / 29 | no file may worsen its own MI/CC |

No reorder triggers fired → UX-1 → UX-2 → UX-3 → UX-4.

---

## Wave 0 — Governance Pre-flight *(1–2 days, before UX-1A)*

All rulebooks land before any `src/ui/**` code.

1. `docs/contracts/CONTRACT_VERSIONING.md` — Contract Version `v1`, back-compat rules, breaking-change criteria, deprecation policy.
2. `docs/architecture/UI_PERFORMANCE_BUDGET.md` — render ≤16ms p95, prop depth ≤4, context fan-out cap, provider nesting ≤6, memoization rules.
3. `docs/architecture/CANONICAL_COMPONENT_CRITERIA.md` — scoring rubric (a11y, API consistency, test coverage, bundle size, RTL, theming, keyboard) **+ Canonical Lifecycle**:
   `Experimental → Candidate → Canonical → Deprecated → Removed`. Every primitive carries an explicit lifecycle state.
4. `docs/architecture/WORKSPACE_API.md` — frozen `WorkspaceDefinition` (`id, name, icon, permissions, navigation, routes, widgets`).
5. `docs/architecture/WORKSPACE_CERTIFICATION.md` — checklist a Workspace must pass to be `Certified`:
   Workspace API satisfied · Scorecard ≥ 90 · UX Regression Checklist PASS · Performance Budget PASS · Contracts used · 0 layer violations · 0 direct DB hits in `ui/`.
6. `docs/architecture/STATE_HIERARCHY.md` — Global → Workspace → Workflow → Screen → Component; state at lowest responsible owner.
7. `docs/qa/UX_REGRESSION_CHECKLIST.md` — keyboard, RTL, mobile, tablet, loading, empty, error, slow network, permission denied, large dataset.
8. `docs/adr/TEMPLATE.md` — Context · Problem · Options · Decision · Consequences · Rollback Plan.
9. `docs/adr/INDEX.md` — **ADR Registry** (sole source of truth):
   ```
   | ADR | Status | Supersedes | Area | Date |
   ```
   Updated in the same PR as every new/superseded ADR.
10. `docs/architecture/ENGINEERING_SCORECARD.md` — Architecture 30 · UX 20 · Perf 15 · A11y 10 · Test Stability 15 · Maintainability 10. Wave passes at **≥ 90/100**.
11. `docs/architecture/TOKEN_CHANGELOG.md` — token version log; **`src/ui/tokens/index.ts` exports `TOKEN_VERSION = "v1"`**. Any token change bumps `v1 → v1.1 → v2` per semver-for-tokens (additive = minor, breaking = major).

**Exit:** all 11 docs merged + linked from `PRINCIPLES.md`; ADR INDEX seeded with ADR-0000.

---

## Wave plan

### UX-1A — Design Foundation *(2–3 days)*
- `src/ui/tokens/` — color (HSL semantic), typography, spacing, radius, elevation, motion. Exports `TOKEN_VERSION`. Single source re-exported to `index.css` + `tailwind.config.ts`.
- Remove **32 `console.*` leftovers**.
- ESLint: warn on hardcoded color utilities in `src/ui/**` and new `as any`.
- **Scorecard run #1.**

**Exit:** tokens consumed by ≥ 1 canonical primitive; leftover console = 0; Vitest ≥ 1187; scorecard ≥ 90; `TOKEN_VERSION = v1` recorded in `TOKEN_CHANGELOG.md`.

### UX-1B — ERP UI Shell ✅ *(complete)*
- `src/ui/layout/` — `AppShell`, `Sidebar`, `Topbar`, `WorkspaceSwitcher`, `NavigationTree`, `Breadcrumbs`, `CommandPalette`, `NotificationCenter`, `StatusBar`, `UserMenu`. Token-only, RTL-aware, slot-driven.
- `src/ui/providers/` — `ShellProvider`, `LayoutProvider` (versioned state), `ThemeProvider` (mode + variant + dir + density), `ShortcutProvider` (scoped), `WorkspaceProvider` (Map-based registry).
- Infrastructure: `WorkspaceRegistry` (register/unregister/replace/list/get/has), `ShellEventBus`, `SlotRegistry`, `LocationAdapter` (default = window; ReactRouterAdapter in UX-1C), `NotificationProvider` contract, `WorkspaceLifecycle` hooks.
- `WorkspaceDefinition` evolved under `@contractVersion v1.1` (additive) — `WorkspaceManifest` is `JSON.stringify`-safe (exit-gate test + fitness check).
- Demo: `src/ui/layout/__demo__/ShellDemo.tsx` drives **3 workspaces** (Finance, Suppliers, CRM) with zero Shell edits.
- Fitness scripts: `check-shell-isolation`, `check-shell-token-only`, `check-shell-a11y`, `check-workspace-api-shape` (+ existing `check-token-export`).
- Carry-overs: `tokens.freeze.test.ts`, `scripts/build-token-json.mjs` → `src/ui/tokens/tokens.json`. RISK-002 (Storybook) deferred to UX-1C. ADR-0002 recorded.

**Exit met:** TSC 0 · Vitest 1199 (+12) · ESLint 0 errors · 5/5 fitness PASS · Workspace manifests serializable.

### UX-1C — Canonical Components *(4–5 days)*
- Score each primitive via `CANONICAL_COMPONENT_CRITERIA.md` → assign lifecycle state → pick canonical → `@deprecated` JSDoc on legacy. **No legacy deletion in UX-1.**
- Each pick = 1 ADR using the template, recorded in **`docs/adr/INDEX.md`**.

| Primitive | Canonical (proposed) | Deprecates |
|---|---|---|
| Button, Input, Select, Dialog, Tabs, Card, Badge | `src/components/ui/*` | `ui-kit/*` + ad-hoc |
| EmptyState / LoadingState / ErrorState | new `src/ui/feedback/` | scattered patterns |

**Scorecard run #3.**

**Exit:** ADRs merged + indexed; lifecycle state set on every canonical and deprecated primitive; UI Perf Budget green on POC route.

### UX-1D — Data Contracts *(3–4 days)*
- `src/contracts/` — types only (`repository.contract.ts`, `query.contract.ts`, `table.contract.ts`, `form.contract.ts`), tagged `@contractVersion v1`.
- **Graduated lint enforcement** for `src/ui/**` / `src/workspaces/**` importing `src/lib/repositories/**` or `@supabase/*`:
  - UX-1: local **warn**
  - UX-2: **CI warning** (`--max-warnings 0` on changed files only)
  - UX-3: **blocking error** (repo-wide)
- Existing `lib/repositories/*` re-typed against `Repository<T>` (types only).
- **Scorecard run #4.**

**Exit:** contracts published + versioned; repositories satisfy `Repository<T>`; Vitest ≥ 1187.

### UX-1E — Suppliers POC *(4–5 days)*
- `src/workspaces/suppliers/` — `/suppliers` using `WorkspaceShell` + canonical components + `DataGridContract` bound to `supplierRepository` via `QueryService`. **No new DB hits.**
- Close RISK-001 (shadow repository) before merge.
- Flag `ux1.suppliersV2` (off in prod, on in preview).
- Run full `UX_REGRESSION_CHECKLIST.md`.
- **Scorecard run #5.**

**Architectural exit criteria (all must pass):**
1. 0 direct repository imports in `src/workspaces/suppliers/**/ui/*`.
2. 100% canonical components in POC route.
3. 0 hardcoded color utilities.
4. 0 legacy components reachable.
5. 0 new entries in `import-layer-violations.json` vs UX-0 (202).
6. Every contract in `src/contracts/` referenced by POC.
7. UX Regression Checklist signed off.
8. UI Performance Budget green.
9. All Fitness Functions PASS.
10. Scorecard ≥ 90.

---

## Architecture Fitness Functions

New folder `scripts/fitness/` — measures system-wide properties, not file-level lint rules. Wired into `verify-determinism.sh` and CI.

| Script | Asserts |
|---|---|
| `check-direct-db.mjs` | UI / workspaces have **0 new** `supabase.*` calls vs baseline 150 |
| `check-layering.mjs` | `import-layer-violations` count never exceeds UX-0 baseline (202) |
| `check-workspace-api.mjs` | every workspace exports a valid `WorkspaceDefinition` |
| `check-canonical-components.mjs` | no `Deprecated` primitive imported by code authored in current wave |
| `check-token-usage.mjs` | no hardcoded color/font/spacing literals in `src/ui/**` and `src/workspaces/**` |

Each emits deterministic JSON in `scripts/fitness/output/`. Failure of any function = wave does not pass.

---

## UX-1 Completion Gate

1. Vitest ≥ 1187 · `tsc --noEmit` = 0 · ESLint errors = 0 (warnings allowed for new UX-1 rules).
2. `as any` (infra+ui) ≤ 30 · leftover console = 0 · circular ≤ 6 · bundle ±5%.
3. All deterministic audits + new `import-layer-violations` PASS.
4. All 5 fitness functions PASS.
5. Average scorecard ≥ 92.
6. ADR-0001…N merged **and indexed in `docs/adr/INDEX.md`**.
7. `TOKEN_VERSION = v1` frozen; `TOKEN_CHANGELOG.md` initialized.
8. Suppliers POC = **Certified Workspace** per `WORKSPACE_CERTIFICATION.md`.
9. **Foundation Freeze declared** — `src/ui/tokens/**`, `src/ui/shell/**`, `src/contracts/**`, canonical primitives in `src/ui/feedback/**` only change via new ADR superseding the relevant UX-1 ADR (with INDEX update).
10. Git tag `foundation-ux1`; MANIFEST bumped to `baselineVersion: "UX-1"`.

## Hard stops
- Change to `src/integrations/supabase/client.ts` or auto-generated files.
- Migration / edge function / new runtime dep without ADR.
- Vitest < 1187 or `tsc --noEmit` failure.
- New direct DB hit in `src/ui/**` or `src/workspaces/**`.
- Non-deterministic audit or fitness output.
- Wave finishes with scorecard < 90 or any fitness function FAIL.

## Technical notes
- **New dirs:** `src/ui/{tokens,shell,feedback}`, `src/contracts/`, `src/workspaces/suppliers/`, `scripts/fitness/`.
- Contracts are types-only → 0 bundle delta.
- Repository re-typing = generics rename, covered by existing unit tests.
- Feature flag via existing user prefs / build env — no new infra.
- New audit `scripts/audits/import-layer-violations.mjs` + fitness functions wired into `verify-determinism.sh`.
- `scripts/audits/scorecard.mjs` aggregates audit + fitness JSON into weighted score.
- Lint graduation handled via per-phase ESLint config flag (`UX_PHASE` env), no rule duplication.

## Out of scope (deferred)
- Legacy primitive removal (UX-2).
- Eliminating 150 direct DB hits (UX-2 → UX-7).
- Finance Workspace (UX-3).
- Monorepo / Plugin SDK / Storybook publication (UX-4.5+).
