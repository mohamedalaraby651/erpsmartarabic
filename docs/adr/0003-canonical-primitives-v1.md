# ADR-0003 — Canonical Primitives v1

- **Status:** Accepted
- **Date:** 2026-06-19
- **UX Phase:** UX-1C
- **Supersedes:** —
- **Companion docs:** `docs/architecture/CANONICAL_COMPONENT_CRITERIA.md`, `docs/architecture/SHELL_INVARIANTS.md`

## Context

UX-1A froze design tokens (`TOKEN_VERSION = v1`) and shipped the Button as the
pilot primitive. UX-1B froze the UI Shell layer and codified its invariants.
The next stable surface required by every workspace is a **canonical primitive
set**: low-level UI building blocks that are workspace-agnostic, token-only,
RTL-correct, and lifecycle-governed.

Without a canonical set, every workspace team would reach back into the legacy
`src/components/ui/*` shadcn primitives, re-introducing direct color values,
physical-direction CSS, and divergent APIs — undoing the governance gains from
UX-1A/UX-1B.

## Decision

We adopt a **Canonical Primitive System (v1)** with the following properties:

1. **Single home.** All canonical primitives live under `src/ui/primitives/**`
   and are exported through `src/ui/index.ts`. Deep imports from individual
   primitive files are forbidden (ESLint + fitness).
2. **Token-only.** Primitives consume styling values exclusively through
   semantic Tailwind classes that resolve to design tokens. No hardcoded
   colors, radii, shadows, font sizes, or pixel spacing.
3. **Shell-isolated.** Primitives MUST NOT import from `src/ui/layout/**`,
   `src/ui/providers/**`, or `src/ui/hooks/**`. They are pure presentational
   units and cannot depend on Shell runtime state.
4. **IO-free.** Primitives inherit Invariant I1 — no `fetch`, no
   `@tanstack/react-query`, no `axios`, no repositories, no Supabase client.
5. **RTL-correct by construction.** Only CSS *logical* properties are
   permitted (`ms-*`/`me-*`/`ps-*`/`pe-*`, `start`/`end`). Physical
   direction utilities (`ml-*`, `mr-*`, `left:`, `right:`, `text-align:left`,
   etc.) are banned and enforced by a fitness function.
6. **Lifecycle-tagged.** Every primitive file begins with a JSDoc block
   declaring `@canonicalState`, `@adr`, and `@since`. Missing or invalid
   tags fail CI.
7. **Scored, not declared.** A primitive only becomes `Canonical` after the
   `score-canonical-components.mjs` script produces a total ≥ 90 with every
   dimension at or above its pass threshold (see
   `CANONICAL_COMPONENT_CRITERIA.md`).
8. **Coexistence, not replacement.** The legacy `src/components/ui/*` set
   is **not** modified in UX-1C. Migration and deprecation are planned for
   the UX-2 entry gate. Both systems may coexist; new code in `src/ui/**`
   and (from UX-2) `src/workspaces/**` MUST use the canonical set.

## Wave 1 Surface (21 primitives)

Form: `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`,
`RadioGroup`, `Switch`, `Label`, `FormField`.

Surface & feedback: `Card`, `Badge`, `Avatar`, `Separator`, `Skeleton`,
`Spinner`, `Tooltip`.

Overlay & navigation: `Dialog`, `Sheet`, `Toast`, `Tabs`.

Tabular surface: `Table` (markup only — no sort/pagination).

DataGrid, Combobox, DatePicker, RichForm orchestration are deferred to
UX-1D.

## Enforcement

| Mechanism | Scope |
|---|---|
| `scripts/fitness/check-primitive-isolation.mjs` | No Shell imports in `src/ui/primitives/**` |
| `scripts/fitness/check-canonical-lifecycle-tags.mjs` | Every primitive declares `@canonicalState` |
| `scripts/fitness/check-rtl-logical-properties.mjs` | No physical-direction CSS in primitives |
| `scripts/fitness/check-shell-token-only.mjs` (extended scope) | Tokens-only inside primitives |
| `scripts/fitness/check-shell-runtime-purity.mjs` (extended scope) | No IO in primitives |
| `scripts/audits/score-canonical-components.mjs` | Per-primitive scorecard |

## Consequences

**Positive**
- Stable, governed UI surface that UX-2 workspaces can build on without
  re-litigating styling or accessibility.
- Lifecycle metadata enables safe deprecation later without flag days.
- Score-driven promotion prevents "declared canonical" drift.

**Negative**
- Two primitive sets coexist until UX-2 migration completes (tracked as
  RISK-003).
- Strict RTL fitness may force compound components (UX-1D) to refactor
  edge cases (tracked as RISK-004).

## References

- `docs/architecture/CANONICAL_COMPONENT_CRITERIA.md`
- `docs/architecture/SHELL_INVARIANTS.md`
- `docs/adr/0002-ui-shell-layout-only.md`
- `docs/risk-log/RISK-003-dual-primitive-systems.md`
- `docs/risk-log/RISK-004-rtl-overlay-regressions.md`
