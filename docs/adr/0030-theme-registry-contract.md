# ADR-0030 — Theme Registry Contract

- **Status:** Accepted
- **Date:** 2026-07-08
- **Wave:** UX-3A Wave 2

## Context

`ThemeProvider` currently hardcodes the set of known themes (`light` / `dark`,
with `themeVariant` handling `corporate` / `highContrast`). Adding a new
theme requires editing the provider — a bad shape for a long-lived platform.

## Decision

Introduce a **Theme Registry** as the single source of truth for
available themes. `ThemeProvider` reads from the registry; adding a theme
is a registration call, not a code edit inside the provider.

### Contract

```ts
export interface ThemeDefinition {
  /** Stable identifier used by consumers and persisted state. */
  id: string;
  /** Human-readable label for pickers. */
  label: string;
  /** Value written to `document.documentElement[data-theme]`. */
  dataAttr: string;
  /** Whether this theme should also toggle Tailwind's `dark` class. */
  prefersDark?: boolean;
  /** WCAG contrast tier this theme is designed to meet. */
  contrast?: "AA" | "AAA";
}

export function registerTheme(def: ThemeDefinition): void;
export function getTheme(id: string): ThemeDefinition | undefined;
export function listThemes(): ReadonlyArray<ThemeDefinition>;
```

### Initial registrations (Wave 2)

| id | label | dataAttr | prefersDark | contrast |
|----|-------|----------|-------------|----------|
| `light` | Light | `light` | `false` | AA |
| `dark` | Dark | `dark` | `true` | AA |
| `high-contrast` | High Contrast | `high-contrast` | `false` | AAA |

The `high-contrast` HSL palette lives in `src/index.css` under
`[data-theme="high-contrast"]`. Its **QA is explicitly deferred to Wave 8**.
Wave 2 only ships the registry + palette stub.

### Rules

- Registrations happen in `src/ui/providers/themeRegistry.ts` at module
  load. No dynamic registration from feature code in Waves 2–7.
- `ThemeProvider` must not `switch` on theme id. It must resolve everything
  through the registry.
- Contrast QA lives in Wave 8 (`Performance & Quality`).

## Consequences

- Zero breaking change to callers. `LayoutProvider.themeMode` stays
  (`light | dark | system`); the registry augments, not replaces, that
  state.
- Future themes (e.g., branded tenant themes) plug in via one call.
- Wave 8 A11y work has a stable substrate to test against.
