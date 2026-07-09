# ADR-0028 — Design System v2 & `ui-kit` Sunset Schedule

- **Status:** Accepted
- **Date:** 2026-07-08
- **Wave:** UX-3A Wave 2
- **Supersedes/extends:** ADR-0003 (Canonical Primitives v1)

## Context

`src/components/ui-kit/**` is a legacy internal kit predating the canonical
`src/ui/primitives/**` and `src/ui/composites/**` layers. Both surfaces coexist
today, which leads to divergent APIs, duplicated components, and inconsistent
token usage. Design System v2 (built on `src/ui/tokens/**`) supersedes it.

## Decision

Adopt Design System v2 as the single source of visual truth. Retire
`src/components/ui-kit/**` on a strict three-wave schedule.

### Sunset Schedule

| Wave | Phase | Action |
|------|-------|--------|
| 2 | **Freeze** | `@deprecated` JSDoc + dev-only `console.warn` on every export. New imports blocked by `check-no-new-ui-kit-imports` (allowlist of current call sites). |
| 3 | **Replace** | Migrate all call sites in feature code from `ui-kit` to `src/ui/primitives` / `src/ui/composites`. Allowlist shrinks monotonically. |
| 4 | **Delete** | Remove `src/components/ui-kit/**` entirely. Allowlist reaches zero. Fitness check flips to "no imports at all". |

### Token Rules (Wave 2 enforcing)

- No raw hex/rgb/hsl in JSX/TSX/CSS Modules — use HSL CSS vars via Tailwind.
- No hardcoded `font-family` — use `--font-sans`.
- No hardcoded `box-shadow` — use `--shadow-*`.
- No hardcoded pixel spacing — use Tailwind spacing scale (4-pt grid).

## Consequences

- 5 fitness checks flip from warn → enforcing during Wave 2.
- Feature teams must run `scripts/audits/design-system-inventory.mjs`
  before opening a PR that touches UI.
- No breaking changes in Wave 2. `ui-kit` continues to work; only new
  imports are blocked.

## Rollback

Sunset can pause between Freeze and Replace if migration effort exceeds
budget. It cannot roll back Freeze itself — the `@deprecated` markers stay.
