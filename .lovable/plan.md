# UX-1D — Contracted Composition Layer (Locked Architecture)

**Goal:** Build the composition tier on top of the certified UI OS Kernel (Tokens + Shell + Primitives). UX-1D introduces **Contracts** and **Composites** under four locked architectural decisions, ensuring the layer absorbs ERP complexity in UX-3 without leaking into Shell, Tokens, or Primitives — and without being re-engineered when the data layer lands in UX-2.

---

## 0. Locked Decisions (binding for UX-1D)

| # | Decision | Implication |
|---|----------|-------------|
| D1 | **Contracts = compile-time only** | No Zod, no runtime validators in `src/ui/contracts/**`. TypeScript-only. |
| D2 | **DataGrid = UI-state composite** | Owns sort/selection/expand UI state. Never decides pagination, never reads server semantics, never touches queries. |
| D3 | **CompositeEvent envelope is mandatory** | All composite-emitted events use `{ type, payload }` with shallow primitive payloads. |
| D4 | **Shell owns overlay lifecycle** | FormDialog is a **declarative spec**. Focus trap, stacking, escape, portal lifecycle live in Shell's Dialog slot. |

These map to invariants **C8–C12** below and are enforced by fitness checks, not convention.

---

## 1. Frozen Scope

Allowed:
- `src/ui/contracts/**` (new)
- `src/ui/composites/**` (new)
- `src/ui/index.ts` (additive public surface)
- `scripts/fitness/**` (new checks)
- `scripts/audits/score-canonical-components.mjs` (extend rubric)
- `docs/adr/0004-composition-contracts-v1.md`
- `docs/architecture/COMPOSITION_CONTRACTS.md`
- `docs/risk-log/RISK-005-composite-state-leak.md`

Forbidden:
- `src/ui/tokens/**` (v1 frozen)
- `src/ui/layout/**`, `src/ui/providers/**`, `src/ui/hooks/**` (Shell frozen — only consumed via existing public API)
- `src/ui/primitives/**` (canonical, only consumed)
- `src/components/ui/**` (legacy; UX-2 deprecation)
- `src/integrations/supabase/**`, `src/lib/repositories/**`, `src/lib/queries/**` (untouched)

---

## 2. Layer Model (after UX-1D)

```text
Workspaces (UX-3)
   ↓
Composites (UX-1D)   ← composition logic only, UI state only
   ↓
Primitives (UX-1C)   ← pure UI atoms
   ↓
Shell (UX-1B)        ← runtime orchestration (overlay, layout, input)
   ↓
Tokens (UX-1A)       ← visual system
```

---

## 3. Deliverables

### 3.1 Contracts — `src/ui/contracts/` (D1)
Pure TS. No React, no runtime modules, no Zod.
- `CompositeEvent.ts` — `type CompositeEvent<T extends string, P extends EventPayload> = { type: T; payload: P }` + `EventPayload` constraint (shallow primitive record).
- `DataGridContract.ts` — `ColumnDef<TRow>`, `RowId`, `SortState`, `SelectionState`, `DensityMode`, `GridUIEvent` union. **No pagination strategy, no async, no fetcher type.**
- `FormContract.ts` — `FieldDescriptor`, `FormLifecyclePhase` (`idle | dirty | submitting | submitted | error`), `FormUIEvent` union. No validator type — adapter-shaped slot only.
- `OverlaySpec.ts` — declarative descriptor consumed by Shell Dialog slot (D4): `{ id, title, size, dismissible, body, footer }`. No focus/portal API exposed.
- `index.ts` — single public surface.

### 3.2 Composites — `src/ui/composites/`
Built **only** from `@/ui` primitives. Every file tagged `@canonicalState`, `@adr ADR-0004`, `@since UX-1D`.

**Result-state tier**
- `EmptyState`, `ErrorState`, `LoadingState`

**Page tier**
- `PageHeader` (title + breadcrumb slot + actions slot)
- `Stat`, `StatGrid` (presentation only)
- `DescriptionList`

**Form tier (D4 declarative)**
- `Form` (controlled orchestrator, schema-agnostic adapter slot)
- `FormSection`, `FormRow`, `FormActions`
- `FieldArray`
- `FormDialog` — emits an `OverlaySpec` to the Shell Dialog slot; **does not render a portal itself**.

**Data tier (D2 UI-state only)**
- `DataGrid` — column render, sort UI toggle, selection UI state, density, sticky header, RTL-correct. Receives `rows`, `columns`, `sort`, `selection` as **controlled props**; emits `CompositeEvent` for changes.
- `DataGridToolbar` — slot-based.
- `Pagination` — presentational only; emits `{ type: "page.change", payload: { page } }`. No data fetch, no total inference.

### 3.3 Governance & Fitness
- **ADR-0004 — Composition Contracts v1** — codifies D1–D4 and C8–C12.
- **`check-composite-isolation.mjs`** — fails on imports from Shell internals, `lib/repositories`, `lib/queries`, `integrations/supabase`, `@tanstack/react-query`, `axios`, raw `fetch`, `zod`.
- **`check-composite-primitive-only.mjs`** — fails on imports from `src/components/ui/**` or raw HTML where a primitive exists.
- **`check-contract-purity.mjs`** — fails if `src/ui/contracts/**` imports React, Zod, or any runtime module (enforces D1).
- **`check-composite-event-envelope.mjs`** — AST scan: every exported composite event type must extend `CompositeEvent<...>` (enforces D3).
- **`check-overlay-ownership.mjs`** — AST scan: forbids `createPortal`, `FocusTrap`, `useFocusTrap`, `Dialog.Portal` outside Shell; `FormDialog` must render via Shell slot only (enforces D4).
- **`check-datagrid-domain-isolation.mjs`** — forbids identifiers `fetch`, `query`, `mutation`, `useQuery`, `supabase` anywhere under `src/ui/composites/data/**` (enforces D2).
- Extend `score-canonical-components.mjs` with composite rubric (a11y, contract conformance, slot purity, RTL, tests, bundle delta). Threshold: ≥ 88 per composite, ≥ 90 average.

### 3.4 Tests
- Smoke + a11y + RTL per composite.
- DataGrid: sort toggle event shape, selection model, keyboard nav, RTL header alignment, **assert no network/query symbol imported**.
- Form: lifecycle events (`form.dirty`, `form.submit`, `form.reset`), error surfacing via `FormField`.
- FormDialog: asserts it emits `OverlaySpec` and renders **zero** portal nodes in isolation (D4).
- Contract type tests (`expectTypeOf`) lock event-envelope and contract shapes.
- Event envelope conformance test: every exported event type is assignable to `CompositeEvent<string, EventPayload>`.

### 3.5 Documentation
- `docs/architecture/COMPOSITION_CONTRACTS.md` — D1–D4, C8–C12, event envelope spec, overlay-ownership rules, DataGrid UI-state model.
- `docs/risk-log/RISK-005-composite-state-leak.md`.

---

## 4. Invariants (codified, enforced)

| ID | Invariant | Enforced by |
|----|-----------|-------------|
| C1 | Composites import only `@/ui/primitives`, `@/ui/contracts`, internal utils. | `check-composite-isolation` |
| C2 | Contracts are pure TS, no runtime. | `check-contract-purity` |
| C3 | All composite events use `CompositeEvent` with shallow primitive payloads. | `check-composite-event-envelope` + type tests |
| C4 | All directional CSS uses logical properties. | `check-rtl-logical-properties` (extended scope) |
| C5 | No composite owns server state. | `check-composite-isolation` |
| C6 | Public surface remains additive; primitive/token APIs unchanged. | `check-token-export` + review |
| C7 | Every composite is `@canonicalState`-tagged, scored, registered. | `check-canonical-lifecycle-tags` (extended) |
| **C8** | **Contracts are compile-time only (no Zod, no runtime validators).** | `check-contract-purity` |
| **C9** | **DataGrid handles UI state only; no domain/query awareness.** | `check-datagrid-domain-isolation` |
| **C10** | **All composite-emitted events use the `CompositeEvent` envelope.** | `check-composite-event-envelope` |
| **C11** | **Shell owns all overlay lifecycle; composites describe, not execute.** | `check-overlay-ownership` |
| **C12** | **Composites are forbidden from data-layer awareness.** | `check-composite-isolation` |

---

## 5. Acceptance Criteria

- 12 composites shipped, tagged + scored (avg ≥ 90, min ≥ 88).
- All new fitness checks PASS; all UX-1A/1B/1C checks remain PASS.
- `tsc --noEmit` = 0; `eslint` = 0.
- Vitest: +40 tests minimum, all green; includes envelope & overlay-ownership tests.
- Zero new imports from Shell internals / data layer / legacy `components/ui` inside `src/ui/composites/**`.
- ADR-0004, COMPOSITION_CONTRACTS.md, RISK-005 committed.
- Demo gallery `src/ui/composites/__demo__/CompositesGallery.tsx` renders DataGrid + Form + PageHeader + FormDialog (via Shell slot) on mock data only.

---

## 6. Out of Scope

- Wiring to repositories/queries → UX-2.
- Runtime schema validation / Zod adapters → UX-2 only if proven necessary.
- Virtualization library selection → UX-1E spike.
- Legacy `src/components/ui/**` deprecation → UX-2 entry gate.
- Domain workspaces → UX-3+.
- Storybook → RISK-002 deferred.

---

## 7. Risks

- **RISK-005 — Composite state leak** (new): composites accidentally subscribing to query/store. Mitigated by `check-composite-isolation` + `check-datagrid-domain-isolation`.
- **RISK-003** stays ACTIVE/CONTAINED.
- **Overlay duplication**: risk that FormDialog grows portal logic. Mitigated by `check-overlay-ownership` (C11).

---

## 8. Execution Order

1. Contracts (`CompositeEvent`, `DataGridContract`, `FormContract`, `OverlaySpec`) + ADR-0004 + `check-contract-purity`.
2. Result-state composites (Empty/Error/Loading) + PageHeader + Stat/StatGrid + DescriptionList.
3. Form tier (Form, FormSection, FormRow, FieldArray, FormActions, FormDialog as OverlaySpec emitter).
4. DataGrid + DataGridToolbar + Pagination (UI-state only).
5. Fitness checks (isolation, envelope, overlay-ownership, datagrid-domain-isolation, primitive-only) + scoring extension.
6. Tests + demo gallery.
7. Closure evidence bundle (scorecard, fitness JSON, vitest report, ADR INDEX update).

---

## 9. Closure Evidence

- `scripts/audits/output/canonical-score.json` (extended)
- `scripts/audits/output/fitness/check-composite-isolation.json`
- `scripts/audits/output/fitness/check-composite-primitive-only.json`
- `scripts/audits/output/fitness/check-contract-purity.json`
- `scripts/audits/output/fitness/check-composite-event-envelope.json`
- `scripts/audits/output/fitness/check-overlay-ownership.json`
- `scripts/audits/output/fitness/check-datagrid-domain-isolation.json`
- Vitest run report; updated ADR INDEX.
