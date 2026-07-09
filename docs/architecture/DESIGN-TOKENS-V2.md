# Design Tokens v2

**Status:** Wave 2 (Design System Consolidation).
**Source of truth:** `src/ui/tokens/**` and `src/index.css` (`:root`, `.dark`,
`[data-theme="high-contrast"]`).

## Principles

1. **HSL-only.** Every color token is authored as `H S% L%`, consumed as
   `hsl(var(--name))`. No hex, no rgb, no OKLCH in feature code.
2. **Semantic before palette.** Components reference roles
   (`--primary`, `--muted-foreground`, `--destructive`), never palette
   values.
3. **One scale per axis.**
   - Spacing: Tailwind's 4-pt grid.
   - Radius: `--radius`, `rounded-{sm,md,lg,xl,2xl}`.
   - Elevation: `--shadow-{xs,sm,md,lg,xl,focus}`.
   - Motion: `--ease-out-soft`, `--ease-in-out-soft`.
4. **Theming via `[data-theme]`.** Themes override HSL variables; components
   don't branch on theme.

## Token surface (Wave 2)

### Color roles

`background`, `foreground`, `card`, `card-foreground`, `popover`,
`popover-foreground`, `primary`, `primary-foreground`, `primary-soft`,
`secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`,
`accent-foreground`, `destructive`, `destructive-foreground`, `success`,
`success-foreground`, `warning`, `warning-foreground`, `info`,
`info-foreground`, `border`, `border-strong`, `input`, `ring`.

### Surfaces

`surface-1`, `surface-2`, `surface-3`, `surface-sunken`.

### Elevation

`shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`,
`shadow-focus`.

### Typography

`--font-sans` (Cairo). No other font families are permitted in feature
code.

## Themes

| id | data-theme | prefersDark | contrast |
|----|------------|-------------|----------|
| `light` | `light` | false | AA |
| `dark` | `dark` | true | AA |
| `high-contrast` | `high-contrast` | false | AAA (QA in Wave 8) |

## Wave 2 fitness checks

- `check-no-raw-colors` — no `#hex`, `rgb(`, `hsl(` literals in
  feature code except `src/index.css` and `tailwind.config.ts`.
- `check-typography-tokens` — no hardcoded `font-family` outside tokens.
- `check-spacing-elevation` — no hardcoded `box-shadow` outside tokens.
- `check-design-system-inventory` — `design-system-inventory.mjs` must
  emit zero findings against feature code.
- `check-no-new-ui-kit-imports` — no new imports of
  `@/components/ui-kit/**` outside the allowlist.

All flip to `enforcing` at the close of Wave 2.
