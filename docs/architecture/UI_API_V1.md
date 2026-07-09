# UI API v1 — Uniformity Charter

**Wave:** UX-3A Wave 2.5. **ADR:** 0029.

## Scope

Four layers, all under `src/ui/**`:

- **Primitives** — atomic building blocks (`Button`, `Input`, `Card`, …)
- **Composites** — coordinated groups (`DataGrid`, `Form`, `PageHeader`, `EmptyState`, …)
- **Layout** — application shell surfaces (`AppShell`, `Sidebar`, `Topbar`, `StatusBar`, `CommandPalette`)
- **Contracts** — typed protocols between UI layers (`CompositeEvent`, `DataGridContract`, `FormContract`, `OverlaySpec`)

## Uniform prop surface

| Prop | Type source | When required |
|------|-------------|---------------|
| `size` | `Size` union in `src/ui/primitives/types.ts` | expressive components |
| `tone` | `Tone` union (`primary\|neutral\|success\|warning\|danger\|info`) | semantic emphasis (DS-001) |
| `variant` | `Variant` union (`solid\|outline\|ghost\|link\|soft`) | multiple visual forms (DS-002) |
| `disabled` | `boolean` | interactive components |
| `loading` | `boolean` | components that trigger async work |
| `className` | `string` | always; merged via `cn(...)` |
| `data-testid` | `string` | always; forwarded to root |
| `ref` | via `React.forwardRef` | components returning a DOM element |
| `displayName` | `string` | always on `forwardRef` |
| `@canonicalState Canonical` | JSDoc tag | always |

## Migration policy

- Additive only. Old prop names remain until Wave 4.
- New props default to the current visual behavior.
- Every component gets a matching test in
  `src/ui/{primitives,composites,layout}/__tests__/api-uniformity.test.ts`.

## Enforcement

- `scripts/fitness/check-ui-api-uniformity.mjs` — warn at Wave 2.5 open,
  enforcing at Wave 2.5 close.
- No `any` in exported types (checked by the same script).
- `check-no-deep-imports`, `check-composite-primitive-only`,
  `check-primitive-isolation` continue to apply from earlier waves.
