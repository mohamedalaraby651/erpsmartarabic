# Canonical Component Criteria & Lifecycle

**Status:** Active (UX-1, Wave 0)

## Purpose

Defines how a UI primitive is scored, promoted, and retired across the ERP UI Operating System. Every primitive carries an explicit lifecycle state — no implicit "canonical forever".

## Scoring Rubric (0–100)

| Dimension | Weight | Pass threshold |
|---|---:|---|
| Accessibility (ARIA, focus, contrast) | 20 | 16 |
| API consistency (props, naming, composition) | 15 | 12 |
| Test coverage (unit + interaction) | 15 | 11 |
| Bundle size (KB gzipped, dependency footprint) | 10 | 7 |
| RTL correctness | 10 | 8 |
| Theming via tokens (no hardcoded values) | 10 | 8 |
| Keyboard support (Tab, Esc, Arrow, Enter) | 10 | 8 |
| Documentation (usage + edge cases) | 10 | 7 |

Promotion to `Canonical` requires total **≥ 90** AND every dimension ≥ its pass threshold.

## Lifecycle States

```text
Experimental → Candidate → Canonical → Deprecated → Removed
```

| State | Meaning | Allowed in production code |
|---|---|---|
| `Experimental` | Prototype; API will change | No (POC routes only, behind flag) |
| `Candidate` | API stable, scoring in progress | Yes, but not the default choice |
| `Canonical` | Sole approved primitive for its role | Yes — required default |
| `Deprecated` | Successor canonical exists; do not use in new code | Existing usages allowed |
| `Removed` | Source deleted | No |

### Transition rules

- `Experimental → Candidate`: passes a11y + RTL + tokens.
- `Candidate → Canonical`: scores ≥ 90, ADR merged, indexed in `docs/adr/INDEX.md`.
- `Canonical → Deprecated`: a new `Canonical` supersedes it; ADR with `Supersedes` column.
- `Deprecated → Removed`: at least one full UX phase elapsed AND zero non-test imports remain (verified by `check-canonical-components.mjs`).

### Authoring requirement

Every primitive file MUST start with a JSDoc block:

```ts
/**
 * @canonicalState Canonical
 * @adr ADR-0007
 * @since UX-1C
 */
```

`Deprecated` primitives MUST also include `@deprecated <use X instead>` so the TypeScript compiler surfaces the warning.

## Enforcement

- `scripts/fitness/check-canonical-components.mjs` fails the wave if code authored in the current wave imports a `Deprecated` primitive.
- Scorecard reads `@canonicalState` tags to compute Architecture and Maintainability sections.
